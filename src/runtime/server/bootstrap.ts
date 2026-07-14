import type { NfzNamedModule, NfzNamedRegistrar, NfzServerBootstrapConfig } from './types'

import {
  beginNfzRuntimeInstance,
  clearNfzRuntimeInstance,
  markNfzRuntimeFailed,
  markNfzRuntimeReady,
  setNfzRuntimeApp,
  setNfzRuntimeCloseHandler,
} from './instance-registry'

async function configureFeathersPlugin(plugin: (app: any) => unknown, app: any, label = 'plugin'): Promise<boolean> {
  if (typeof plugin !== 'function')
    return true

  try {
    const result = plugin(app)
    if (result && typeof (result as Promise<unknown>).then === 'function')
      await result
    return true
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error || '')
    const missingMongoClient = message.includes("uses adapter 'mongodb'")
      && message.includes("app.get('mongodbClient') is not configured")

    if (missingMongoClient) {
      console.warn(`[nuxt-feathers-zod] Skipping ${label} because MongoDB infrastructure is not initialized (missing app.get('mongodbClient')).`)
      return false
    }

    throw error
  }
}

async function runNamedRegistrars(items: NfzNamedRegistrar[], app: any): Promise<void> {
  for (const item of items)
    await configureFeathersPlugin(item.handler, app, item.label)
}

async function runNamedModules(items: NfzNamedModule[], app: any, nitroApp: any, config: any): Promise<void> {
  for (const item of items) {
    if (typeof item.handler !== 'function')
      continue

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

async function closeMongoClient(app: any): Promise<void> {
  const client = app?.get?.('mongodbConnection')
  if (client && typeof client.close === 'function')
    await client.close()
}

export function createServerBootstrap(runtime: NfzServerBootstrapConfig) {
  return async function bootstrapNfzServer(nitroApp: any): Promise<void> {
    const instanceId = runtime.instanceId || 'default'
    const instance = beginNfzRuntimeInstance(instanceId)
    let app: any

    const close = async (): Promise<void> => {
      if (!app)
        return

      try {
        await app.teardown?.()
      }
      finally {
        try {
          await closeMongoClient(app)
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
      const mongoConfigured = Boolean(runtime.config?.database?.mongo?.enabled && runtime.config?.database?.mongo?.url)
      console.info(`[NFZ server] mongo configured=${mongoConfigured ? 'true' : 'false'} url=${mongoConfigured ? '[configured]' : ''}`)

      app = await runtime.createApp(nitroApp, runtime.config)
      setNfzRuntimeApp(instance, app)
      exposeLegacyGlobalApp(app)

      if (typeof runtime.initSwagger === 'function')
        await runtime.initSwagger(app, runtime.config)

      if (typeof runtime.initKeycloak === 'function')
        await runtime.initKeycloak(app, runtime.config)

      await runtime.configureInfrastructure(app, runtime.config)
      console.info(`[NFZ server] mongo infrastructure ready=${app.get('mongodb_ok') === true ? 'true' : 'false'}`)

      for (const phase of runtime.loadOrder) {
        if (phase === 'modules:pre') {
          await runNamedModules(runtime.preModules, app, nitroApp, runtime.config)
          continue
        }

        if (phase === 'plugins') {
          await runNamedRegistrars(runtime.plugins, app)
          continue
        }

        if (phase === 'services') {
          await runNamedRegistrars(runtime.services, app)
          continue
        }

        if (phase === 'modules:post')
          await runNamedModules(runtime.postModules, app, nitroApp, runtime.config)
      }

      if (typeof runtime.expressErrorHandler === 'function')
        app.configure(runtime.expressErrorHandler)

      await app.setup()
      await runtime.createRouters(app)
      markNfzRuntimeReady(instance, app)
    }
    catch (error) {
      const failure = markNfzRuntimeFailed(instance, error)
      try {
        await instance.close()
      }
      finally {
        clearNfzRuntimeInstance(instanceId)
      }
      throw failure
    }
  }
}
