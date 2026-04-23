import type { NfzNamedModule, NfzNamedRegistrar, NfzServerBootstrapConfig } from './types'

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

function exposeGlobalApp(app: any): void {
  ;(globalThis as any).__NFZ_EMBEDDED_APP = app
  if (typeof app === 'function') {
    ;(globalThis as any).__NFZ_EMBEDDED_EXPRESS_APP = app
  }
}

export function createServerBootstrap(runtime: NfzServerBootstrapConfig) {
  return async function bootstrapNfzServer(nitroApp: any): Promise<void> {
    const mongoConfigured = Boolean(runtime.config?.database?.mongo?.enabled && runtime.config?.database?.mongo?.url)
    console.info(`[NFZ server] mongo configured=${mongoConfigured ? 'true' : 'false'} url=${mongoConfigured ? '[configured]' : ''}`)

    const app = await runtime.createApp(nitroApp, runtime.config)
    exposeGlobalApp(app)

    if (typeof runtime.initSwagger === 'function')
      await runtime.initSwagger(app)

    if (typeof runtime.initKeycloak === 'function')
      await runtime.initKeycloak(app)

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
    runtime.createRouters(app)

    nitroApp.hooks.hook('close', async () => app.teardown())
  }
}
