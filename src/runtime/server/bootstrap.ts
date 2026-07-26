import type {
  NfzDuplicateServiceDiagnostic,
  NfzDuplicateServicePolicy,
  NfzNamedModule,
  NfzNamedRegistrar,
  NfzRegistrarPhase,
  NfzServerBootstrapConfig,
  NfzServiceRegistration,
  NfzSkippedRegistrar,
} from './types'

import {
  claimNfzRuntimeInstance,
  markNfzRuntimeFailed,
  markNfzRuntimeReady,
  setNfzRuntimeApp,
  setNfzRuntimeCloseHandler,
} from './instance-registry'

class DuplicateServiceSkipError extends Error {
  constructor(
    readonly diagnostic: NfzDuplicateServiceDiagnostic,
    readonly registrar: NfzNamedRegistrar,
    readonly phase: NfzRegistrarPhase,
  ) {
    super(`[nuxt-feathers-zod] Duplicate service registration skipped: ${diagnostic.path}`)
    this.name = 'DuplicateServiceSkipError'
  }
}

function isMissingDatabaseInfrastructureError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '')
  const missingMongoClient = message.includes('uses adapter \'mongodb\'')
    && message.includes('app.get(\'mongodbClient\') is not configured')
  const missingNamedDatabase = message.includes('NFZ database registry is not configured')
    || (/Database connection '.+' is not configured or is disabled\./.test(message))

  return missingMongoClient || missingNamedDatabase
}

function normalizeServicePath(value: unknown): string | null {
  if (typeof value !== 'string')
    return null
  const normalized = value.trim().replace(/^\/+|\/+$/g, '')
  return normalized || null
}

function getAppArray<T>(app: any, key: string): T[] {
  const current = app?.get?.(key)
  return Array.isArray(current) ? current : []
}

function appendAppArray<T>(app: any, key: string, value: T): void {
  app?.set?.(key, [...getAppArray<T>(app, key), value])
}

function appendSkippedRegistrar(app: any, diagnostic: NfzSkippedRegistrar): void {
  appendAppArray(app, 'nfzSkippedRegistrars', diagnostic)
}

function appendServiceRegistration(app: any, registration: NfzServiceRegistration): void {
  appendAppArray(app, 'nfzServiceRegistrations', registration)
}

function appendDuplicateDiagnostic(app: any, diagnostic: NfzDuplicateServiceDiagnostic): void {
  appendAppArray(app, 'nfzDuplicateServiceRegistrations', diagnostic)
}

function formatRegistrationSource(registration: NfzServiceRegistration): string {
  return registration.source || registration.label
}

function createDuplicateServiceError(diagnostic: NfzDuplicateServiceDiagnostic): Error {
  return new Error(
    `[nuxt-feathers-zod] Duplicate service registration: ${diagnostic.path}\n`
    + `first: ${formatRegistrationSource(diagnostic.first)}\n`
    + `second: ${formatRegistrationSource(diagnostic.second)}`,
  )
}

function hasPreExistingService(app: any, path: string): boolean {
  const services = app?.services
  return Boolean(services && typeof services === 'object' && Object.prototype.hasOwnProperty.call(services, path))
}

async function configureFeathersRegistrar(
  item: NfzNamedRegistrar,
  app: any,
  phase: NfzRegistrarPhase,
  allowMissingDatabaseServices: boolean,
  duplicateServicePolicy: NfzDuplicateServicePolicy,
  registrations: Map<string, NfzServiceRegistration>,
  trace: (message: string) => void,
): Promise<void> {
  if (typeof item.handler !== 'function')
    return

  const originalUse = typeof app?.use === 'function' ? app.use : undefined
  const registrarRegistration = (path: string): NfzServiceRegistration => ({
    path,
    label: item.label,
    source: item.source,
    phase,
  })

  if (originalUse) {
    app.use = function nfzTrackedUse(this: unknown, ...args: unknown[]) {
      const path = normalizeServicePath(args[0])
      if (!path)
        return originalUse.apply(this, args)

      const second = registrarRegistration(path)
      const first = registrations.get(path)
        ?? (hasPreExistingService(app, path)
          ? { path, label: 'pre-existing runtime service', phase, source: 'runtime pre-registration' } satisfies NfzServiceRegistration
          : undefined)

      if (first) {
        const diagnostic: NfzDuplicateServiceDiagnostic = {
          path,
          policy: duplicateServicePolicy,
          first,
          second,
        }
        appendDuplicateDiagnostic(app, diagnostic)

        if (duplicateServicePolicy === 'skip')
          throw new DuplicateServiceSkipError(diagnostic, item, phase)

        throw createDuplicateServiceError(diagnostic)
      }

      try {
        const result = originalUse.apply(this, args)
        registrations.set(path, second)
        appendServiceRegistration(app, second)
        trace(`service=${path} source=${formatRegistrationSource(second)} registered=true`)
        return result
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error || '')
        if (/Path .+ already exists/i.test(message)) {
          const diagnostic: NfzDuplicateServiceDiagnostic = {
            path,
            policy: duplicateServicePolicy,
            first: {
              path,
              label: 'pre-existing runtime service',
              source: 'runtime pre-registration',
              phase,
            },
            second,
          }
          appendDuplicateDiagnostic(app, diagnostic)
          if (duplicateServicePolicy === 'skip')
            throw new DuplicateServiceSkipError(diagnostic, item, phase)
          throw createDuplicateServiceError(diagnostic)
        }
        throw error
      }
    }
  }

  try {
    await Promise.resolve(item.handler(app))
  }
  catch (error) {
    if (error instanceof DuplicateServiceSkipError) {
      appendSkippedRegistrar(app, {
        label: item.label,
        source: item.source,
        phase,
        reason: 'duplicate-service',
        servicePath: error.diagnostic.path,
      })
      console.warn(`[nuxt-feathers-zod] Skipping ${item.label}: service path "${error.diagnostic.path}" is already registered by ${formatRegistrationSource(error.diagnostic.first)}.`)
      return
    }

    if (!isMissingDatabaseInfrastructureError(error))
      throw error

    const required = item.required ?? !allowMissingDatabaseServices
    if (required) {
      const failure = new Error(
        `[nuxt-feathers-zod] Required ${item.label} could not start because its configured database infrastructure is unavailable.`,
      ) as Error & { cause?: unknown }
      failure.cause = error
      throw failure
    }

    const diagnostic: NfzSkippedRegistrar = {
      label: item.label,
      source: item.source,
      phase,
      reason: 'database-infrastructure-unavailable',
    }
    appendSkippedRegistrar(app, diagnostic)
    console.warn(`[nuxt-feathers-zod] Skipping optional ${item.label} because its configured database infrastructure is not initialized.`)
  }
  finally {
    if (originalUse)
      app.use = originalUse
  }
}

async function runNamedRegistrars(
  items: NfzNamedRegistrar[],
  app: any,
  phase: NfzRegistrarPhase,
  allowMissingDatabaseServices: boolean,
  duplicateServicePolicy: NfzDuplicateServicePolicy,
  registrations: Map<string, NfzServiceRegistration>,
  trace: (message: string) => void,
  onRegistrar?: (item: NfzNamedRegistrar) => void,
): Promise<void> {
  trace(`phase=${phase} count=${items.length}`)
  for (const item of items) {
    onRegistrar?.(item)
    await configureFeathersRegistrar(
      item,
      app,
      phase,
      allowMissingDatabaseServices,
      duplicateServicePolicy,
      registrations,
      trace,
    )
  }
}

async function runNamedModules(
  items: NfzNamedModule[],
  app: any,
  nitroApp: any,
  config: any,
  phase: 'modules:pre' | 'modules:post',
  trace: (message: string) => void,
  onRegistrar?: (item: NfzNamedModule) => void,
): Promise<void> {
  trace(`phase=${phase} count=${items.length}`)
  for (const item of items) {
    onRegistrar?.(item)
    if (typeof item.handler !== 'function')
      continue

    trace(`phase=${phase} registrar=${item.source || item.label} start`)
    await item.handler(app, {
      nitroApp,
      config,
      transports: config?.transports,
      server: config?.server,
      moduleOptions: item.moduleOptions ?? null,
    })
  }
}

function exposeLegacyGlobalApp(app: any): void {
  ;(globalThis as any).__NFZ_EMBEDDED_APP = app
  if (typeof app === 'function') {
    ;(globalThis as any).__NFZ_EMBEDDED_EXPRESS_APP = app
  }
}

function clearLegacyGlobalApp(app: any): void {
  if ((globalThis as any).__NFZ_EMBEDDED_APP === app)
    delete (globalThis as any).__NFZ_EMBEDDED_APP
  if ((globalThis as any).__NFZ_EMBEDDED_EXPRESS_APP === app)
    delete (globalThis as any).__NFZ_EMBEDDED_EXPRESS_APP
}

async function closeDatabaseInfrastructure(app: any): Promise<void> {
  const registry = app?.get?.('databaseRegistry')
  if (registry && typeof registry.closeAll === 'function') {
    await registry.closeAll()
    return
  }

  const client = app?.get?.('mongodbConnection')
  if (client && typeof client.close === 'function')
    await client.close()
}

function normalizeDuplicateServicePolicy(value: unknown): NfzDuplicateServicePolicy {
  return value === 'skip' ? 'skip' : 'error'
}

export function createServerBootstrap(runtime: NfzServerBootstrapConfig) {
  return async function bootstrapNfzServer(nitroApp: any): Promise<void> {
    const instanceId = runtime.instanceId || 'default'
    const claim = claimNfzRuntimeInstance(instanceId)
    const instance = claim.instance

    if (!claim.created) {
      if (instance.status === 'ready')
        return
      if (instance.status === 'initializing') {
        await instance.ready
        return
      }
      if (instance.status === 'failed')
        throw instance.error || new Error(`[nuxt-feathers-zod] Runtime instance "${instanceId}" failed to start.`)
      throw new Error(`[nuxt-feathers-zod] Runtime instance "${instanceId}" is ${instance.status}.`)
    }

    const debug = runtime.debug === true || runtime.config?.server?.bootstrapDiagnostics === true
    const trace = (message: string): void => {
      if (debug)
        console.info(`[NFZ bootstrap] instance=${instanceId} ${message}`)
    }

    let app: any
    let currentPhase = 'claim'
    let currentRegistrar = 'runtime'
    const registrations = new Map<string, NfzServiceRegistration>()

    const close = async (): Promise<void> => {
      if (!app)
        return

      try {
        await app.teardown?.()
      }
      finally {
        try {
          await closeDatabaseInfrastructure(app)
        }
        finally {
          clearLegacyGlobalApp(app)
        }
      }
    }
    setNfzRuntimeCloseHandler(instance, close)
    nitroApp.hooks.hook('close', async () => {
      await instance.close()
    })

    try {
      const configuredConnections = Object.values(
        runtime.config?.database?.connections || {},
      ).filter((connection: any) => connection?.enabled !== false)
      const allowMissingDatabaseServices = runtime.config?.server?.allowMissingDatabaseServices === true
      const duplicateServicePolicy = normalizeDuplicateServicePolicy(runtime.config?.server?.duplicateServicePolicy)
      console.info(`[NFZ server] database connections configured=${configuredConnections.length}`)
      trace('status=initializing')

      currentPhase = 'create-app'
      app = await runtime.createApp(nitroApp, runtime.config)
      app?.set?.('nfzSkippedRegistrars', [])
      app?.set?.('nfzServiceRegistrations', [])
      app?.set?.('nfzDuplicateServiceRegistrations', [])
      setNfzRuntimeApp(instance, app)
      exposeLegacyGlobalApp(app)

      currentPhase = 'swagger'
      if (typeof runtime.initSwagger === 'function')
        await runtime.initSwagger(app, runtime.config)

      currentPhase = 'keycloak'
      if (typeof runtime.initKeycloak === 'function')
        await runtime.initKeycloak(app, runtime.config)

      currentPhase = 'infrastructure'
      await runtime.configureInfrastructure(app, runtime.config)
      console.info(`[NFZ server] database infrastructure ready=${app.get('database_ok') === true ? 'true' : 'false'}`)

      for (const phase of runtime.loadOrder) {
        currentPhase = phase
        currentRegistrar = phase
        if (phase === 'modules:pre') {
          await runNamedModules(
            runtime.preModules,
            app,
            nitroApp,
            runtime.config,
            'modules:pre',
            trace,
            (item) => { currentRegistrar = item.source || item.label },
          )
          continue
        }

        if (phase === 'plugins') {
          await runNamedRegistrars(
            runtime.plugins,
            app,
            'plugins',
            allowMissingDatabaseServices,
            duplicateServicePolicy,
            registrations,
            trace,
            (item) => { currentRegistrar = item.source || item.label },
          )
          continue
        }

        if (phase === 'services') {
          await runNamedRegistrars(
            runtime.services,
            app,
            'services',
            allowMissingDatabaseServices,
            duplicateServicePolicy,
            registrations,
            trace,
            (item) => { currentRegistrar = item.source || item.label },
          )
          continue
        }

        if (phase === 'modules:post') {
          await runNamedModules(
            runtime.postModules,
            app,
            nitroApp,
            runtime.config,
            'modules:post',
            trace,
            (item) => { currentRegistrar = item.source || item.label },
          )
        }
      }

      currentPhase = 'error-handler'
      if (typeof runtime.expressErrorHandler === 'function') {
        app.configure((configuredApp: any) => runtime.expressErrorHandler?.(configuredApp))
      }

      currentPhase = 'setup'
      await app.setup()
      currentPhase = 'routers'
      await runtime.createRouters(app)
      markNfzRuntimeReady(instance, app)
      trace(`status=ready services=${registrations.size}`)
    }
    catch (error) {
      const failure = markNfzRuntimeFailed(instance, error)
      console.error(`[NFZ bootstrap] instance=${instanceId} status=failed phase=${currentPhase} registrar=${currentRegistrar} causeId=${instance.failureId || 'unavailable'}`)
      await instance.close()
      throw failure
    }
  }
}
