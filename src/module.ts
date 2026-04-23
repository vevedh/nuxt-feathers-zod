import type { ModuleDependencies, Nuxt } from '@nuxt/schema'
import type {
  FeathersPublicRuntimeConfig,
  FeathersRuntimeConfig,
  ModuleConfig,
  ModuleOptions,
  ResolvedOptions,
} from './runtime/options'

import { createRequire } from 'node:module'
import { addImportsDir, createResolver, defineNuxtModule } from '@nuxt/kit'
import { consola } from 'consola'
import defu from 'defu'

import { resolveOptions } from './runtime/options'
import { serverDefaults } from './runtime/options/server'
import { applyAliases } from './setup/apply-aliases'
import { applyClientLayer } from './setup/apply-client-layer'
import { applyDevtoolsLayer } from './setup/apply-devtools'
import { applyMcpLayer } from './setup/apply-mcp'
import { applyRuntimeConfig } from './setup/apply-runtime-config'
import { applyServerLayer } from './setup/apply-server-layer'
import { applyTypeIncludes } from './setup/apply-type-includes'

declare module '@nuxt/schema' {
  interface NuxtConfig {
    feathers?: ModuleConfig
  }

  interface RuntimeConfig {
    _feathers: FeathersRuntimeConfig
  }

  interface PublicRuntimeConfig {
    _feathers: FeathersPublicRuntimeConfig
  }
}

export default defineNuxtModule<ModuleOptions>({
  moduleDependencies: {} as ModuleDependencies,
  meta: {
    name: 'nuxt-feathers-zod',
    configKey: 'feathers',
    compatibility: { nuxt: '^4.0.0' },
  },
  defaults: {
    transports: { websocket: true },
    server: serverDefaults,
    client: true,
    servicesDirs: ['services'],
    validator: { formats: [], extendDefaults: true },
    loadFeathersConfig: false,
    auth: true,
    swagger: false,
    devtools: true,
  },
  async setup(options, nuxt: Nuxt) {
    const resolver = createResolver(import.meta.url)
    const resolvedOptions: ResolvedOptions = await resolveOptions(options, nuxt)

    if (resolvedOptions.swagger) {
      const require = createRequire(import.meta.url)
      try {
        require.resolve('feathers-swagger', { paths: [nuxt.options.rootDir] })
      }
      catch {
        consola.warn(
          'feathers.swagger is enabled but \'feathers-swagger\' could not be resolved from this Nuxt project. '
          + 'Install it in your app (root) dependencies: bun add feathers-swagger swagger-ui-dist',
        )
      }
    }

    addImportsDir(resolver.resolve('./runtime/composables'))

    applyRuntimeConfig(resolvedOptions, nuxt)
    applyAliases(resolvedOptions, nuxt)
    applyTypeIncludes(resolvedOptions, nuxt)

    if (resolvedOptions.transports.websocket) {
      nuxt.hook('nitro:config' as any, (nitroConfig: any) => {
        nitroConfig.experimental = defu(nitroConfig.experimental, { websocket: true })
      })
    }

    const servicesDetected = await applyServerLayer(resolvedOptions, nuxt)
    await applyClientLayer(resolvedOptions, nuxt)

    applyDevtoolsLayer(nuxt, resolvedOptions, servicesDetected)
    applyMcpLayer(nuxt, resolvedOptions)
  },
})
