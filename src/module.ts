import type { ModuleDependencies, Nuxt } from '@nuxt/schema'
import type {
  FeathersPublicRuntimeConfig,
  FeathersRuntimeConfig,
  ModuleConfig,
  ModuleOptions,
  ResolvedOptions,
} from './runtime/options'
import type { ClientOptions } from './runtime/options/client'
import type { PiniaModuleOptions } from './runtime/options/client/pinia'

import { createRequire } from 'node:module'
import {
  addImports,
  addImportsDir,
  addPlugin,
  addServerHandler,
  addServerPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  hasNuxtModule,
} from '@nuxt/kit'
import { consola } from 'consola'
import defu from 'defu'

import { setupNfzDevtools } from './devtools'
import { resolveOptions, resolvePublicRuntimeConfig, resolveRuntimeConfig } from './runtime/options'
import { detectResolvedMode, isResolvedRemoteAuthEnabled, isResolvedServerEnabled } from './runtime/options/mode'
import { serverDefaults } from './runtime/options/server'
import { addServicesImports, getServicesImports } from './runtime/services'
import { getClientTemplates } from './runtime/templates/client'
import { resolveTemplateOverrideForFilename } from './runtime/templates/overrides'
import { getServerTemplates } from './runtime/templates/server'

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

function dedupeStrings(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0)))
}

function aliasKey(find: any) {
  return typeof find === 'string' ? `str:${find}` : `re:${find?.toString?.() ?? String(find)}`
}

function normalizeViteAliases(input: any) {
  const list = Array.isArray(input)
    ? input
    : Object.entries(input || {}).map(([find, replacement]) => ({ find, replacement }))

  const map = new Map<string, any>()
  for (const entry of list) {
    if (!entry)
      continue
    map.set(`${aliasKey(entry.find)}=>${String(entry.replacement)}`, entry)
  }
  return Array.from(map.values())
}

function setAliases(options: ResolvedOptions, nuxt: Nuxt) {
  const resolver = createResolver(import.meta.url)
  const aliases = {
    'nuxt-feathers-zod/server': resolver.resolve(options.templateDir, 'server/server'),
    'nuxt-feathers-zod/validators': resolver.resolve('runtime/zod/validators'),
    'nuxt-feathers-zod/query': resolver.resolve('runtime/zod/query'),
    'nuxt-feathers-zod/zod': resolver.resolve('runtime/zod/index'),
    'nuxt-feathers-zod/options': resolver.resolve('runtime/options'),
    'nuxt-feathers-zod/auth-utils': resolver.resolve('runtime/utils/auth'),
    'nuxt-feathers-zod/config-utils': resolver.resolve('runtime/utils/config'),
  }

  nuxt.options.alias = defu(nuxt.options.alias, aliases)
  if (options.client)
    nuxt.options.alias['nuxt-feathers-zod/client'] = resolver.resolve(options.templateDir, 'client/client')

  nuxt.options.vite = nuxt.options.vite || {}
  nuxt.options.vite.resolve = nuxt.options.vite.resolve || {}
  const viteAliases = normalizeViteAliases(nuxt.options.vite.resolve.alias)

  for (const [find, replacement] of Object.entries(aliases))
    viteAliases.push({ find, replacement })

  if (options.keycloak) {
    viteAliases.push({
      find: /^js-sha256$/,
      replacement: resolver.resolve('runtime/shims/js-sha256-default'),
    })
  }

  nuxt.options.vite.resolve.alias = normalizeViteAliases(viteAliases)
  nuxt.options.vite.optimizeDeps = nuxt.options.vite.optimizeDeps || {}
  nuxt.options.vite.optimizeDeps.include = dedupeStrings([
    ...(nuxt.options.vite.optimizeDeps.include || []),
    ...(options.keycloak ? ['keycloak-js', 'js-sha256'] : []),
  ])

  nuxt.hook('nitro:config' as any, async (nitroConfig: any) => {
    nitroConfig.alias = defu(nitroConfig.alias, aliases)
  })
}

function setTsIncludes(options: ResolvedOptions, nuxt: Nuxt) {
  const resolver = createResolver(import.meta.url)
  const servicesDirs = (options.servicesDirs || []).map(dir => resolver.resolve(dir, '**/*.ts'))
  const serverModuleDirs = Array.isArray((options.server as any)?.moduleDirs)
    ? ((options.server as any).moduleDirs as string[])
    : ((options.server as any)?.moduleDirs ? [String((options.server as any).moduleDirs)] : [])
  const serverModulesGlobs = serverModuleDirs.map(dir => resolver.resolve(dir, '*.ts'))
  const includeGlobs = [...servicesDirs, ...serverModulesGlobs]

  nuxt.hook('prepare:types', async ({ tsConfig }) => {
    tsConfig.include = dedupeStrings([...(tsConfig.include || []), ...includeGlobs])
  })

  nuxt.hook('nitro:config' as any, (nitroConfig: any) => {
    // nitroConfig.typescript may be undefined depending on Nuxt/Nitro version
    nitroConfig.typescript = nitroConfig.typescript || {}
    nitroConfig.typescript.tsConfig = nitroConfig.typescript.tsConfig || {}
    nitroConfig.typescript.tsConfig.include = dedupeStrings([
      ...(nitroConfig.typescript.tsConfig.include || []),
      ...includeGlobs,
    ])
  })
}

/**
 * Pinia module alignment (best effort).
 * If @pinia/nuxt is installed but not activated, register it in Nuxt modules.
 * If it is missing, emit an actionable DX warning without side effects.
 */
async function ensurePinia(client: ClientOptions, nuxt: Nuxt) {
  const piniaEnabled = client.pinia !== false && Boolean(client.pinia)
  if (!piniaEnabled)
    return

  const active = hasNuxtModule('@pinia/nuxt')
  if (active)
    return

  const require = createRequire(import.meta.url)
  const storesDirs = (client.pinia as PiniaModuleOptions)?.storesDirs
  const storesHint = storesDirs?.length ? ` (storesDirs: ${JSON.stringify(storesDirs)})` : ''

  try {
    require.resolve('@pinia/nuxt', { paths: [nuxt.options.rootDir] })
    nuxt.options.modules = nuxt.options.modules || []
    if (!nuxt.options.modules.includes('@pinia/nuxt')) {
      nuxt.options.modules = Array.from(new Set([...(nuxt.options.modules || []), '@pinia/nuxt']))
      consola.info('[nuxt-feathers-zod] Added @pinia/nuxt to Nuxt modules because feathers.client.pinia is enabled.')
    }
  }
  catch {
    consola.warn(
      `[nuxt-feathers-zod] feathers.client.pinia is enabled but @pinia/nuxt is not installed.${storesHint} `
      + `Install it manually: bun add -D @pinia/nuxt and add '@pinia/nuxt' to your app modules.`,
    )
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
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Resolve and normalize options (single source of truth)
    const resolvedOptions: ResolvedOptions = await resolveOptions(options, nuxt)
    const mode = detectResolvedMode(resolvedOptions)
    const serverEnabled = isResolvedServerEnabled(resolvedOptions)

    // DX validation: if Swagger is enabled but the dependency is not resolvable from the project,
    // emit a clear warning early (build/start time) rather than failing later at runtime.
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

    // Runtime config (always)
    nuxt.options.runtimeConfig._feathers = resolveRuntimeConfig(resolvedOptions)
    nuxt.options.runtimeConfig.public._feathers = resolvePublicRuntimeConfig(resolvedOptions)

    // Prepare tsconfig and aliases (safe for both modes)
    setAliases(resolvedOptions, nuxt)
    setTsIncludes(resolvedOptions, nuxt)

    // Nitro websocket support if requested
    if (resolvedOptions.transports.websocket) {
      nuxt.hook('nitro:config' as any, (nitroConfig: any) => {
        nitroConfig.experimental = defu(nitroConfig.experimental, { websocket: true })
      })
    }

    // Auto imports
    addImportsDir(resolver.resolve('./runtime/composables'))

    // Pinia module alignment (best effort) — for both remote and embedded
    if (resolvedOptions.client) {
      await ensurePinia(resolvedOptions.client as ClientOptions, nuxt)
    }

    const servicesImports = mode === 'embedded' && serverEnabled
      ? await getServicesImports(resolvedOptions.servicesDirs)
      : []

    if (nuxt.options.dev && resolvedOptions.devtools) {
      setupNfzDevtools(
        nuxt,
        resolvedOptions,
        {
          servicesDetected: servicesImports.map(item => ({
            name: item.as || item.name,
            from: item.from,
          })),
        },
      )
    }

    // Embedded-only: scan local services + add typed imports
    if (mode === 'embedded' && serverEnabled) {
      await addServicesImports(servicesImports)
    }

    // Server templates/plugin only when server is enabled.
    if (mode === 'embedded' && serverEnabled) {
      let serverPluginDst: string | undefined
      let restBridgeDst: string | undefined
      for (const serverTemplate of getServerTemplates(resolvedOptions)) {
        const ov = resolveTemplateOverrideForFilename(serverTemplate.filename, resolvedOptions)
        const tpl = addTemplate(ov
          ? { filename: serverTemplate.filename, src: ov.absPath, write: true, options: resolvedOptions }
          : { ...serverTemplate, options: resolvedOptions })
        if (serverTemplate.filename?.endsWith('server/plugin.ts') || serverTemplate.filename?.endsWith('server/plugin'))
          serverPluginDst = tpl.dst
        if (serverTemplate.filename?.endsWith('server/rest-bridge.ts') || serverTemplate.filename?.endsWith('server/rest-bridge'))
          restBridgeDst = tpl.dst
      }
      addServerPlugin(serverPluginDst ?? resolver.resolve(resolvedOptions.templateDir, 'server/plugin.ts'))

      const restTransport = resolvedOptions.transports?.rest as any
      const restPath = typeof restTransport?.path === 'string' ? restTransport.path : ''
      const restFramework = typeof restTransport?.framework === 'string' ? restTransport.framework : ''
      if (restBridgeDst && restFramework === 'express' && restPath && restPath !== '/') {
        const normalizedRestPath = restPath.startsWith('/') ? restPath : `/${restPath}`
        addServerHandler({
          route: `${normalizedRestPath}/**`,
          handler: restBridgeDst,
          middleware: true,
        })
      }
    }

    // Client templates/plugin when client is enabled.
    if (resolvedOptions.client) {
      const clientOptions = resolvedOptions.client as ClientOptions
      const piniaEnabled = clientOptions.pinia !== false && Boolean(clientOptions.pinia)

      // If Pinia is enabled, enable auth/bootstrap plugins as needed.
      if (piniaEnabled) {
        nuxt.hook('vite:extendConfig', (config) => {
          const viteConfig = config as any
          viteConfig.optimizeDeps ||= {}
          viteConfig.optimizeDeps.include = dedupeStrings([...(viteConfig.optimizeDeps.include || []), 'feathers-pinia'])
        })

        // Auth bootstrap is needed in two situations:
        // 1) Embedded auth pipeline is enabled (local/jwt/oauth) AND server is enabled
        // 2) Remote mode has auth enabled (authentication-client)
        const enableAuthBootstrap = Boolean(
          (resolvedOptions.auth && serverEnabled)
          || isResolvedRemoteAuthEnabled(resolvedOptions),
        )
        if (enableAuthBootstrap) {
          addImports({ from: resolver.resolve('./runtime/stores/auth'), name: 'useAuthStore' })
          addPlugin({ order: 21, src: resolver.resolve('./runtime/plugins/feathers-auth') })
        }

        // Keycloak SSO can be used in both embedded and remote modes.
        if (resolvedOptions.keycloak) {
          addPlugin({ order: 22, src: resolver.resolve('./runtime/plugins/keycloak-sso'), mode: 'client' })
        }
      }

      // Generate client templates and register the client plugin using the actual generated file path.
      // This avoids Nuxt trying to annotate a non-existent file (ENOENT).
      let clientPluginDst: string | undefined
      for (const clientTemplate of getClientTemplates(resolvedOptions, resolver)) {
        const ov = resolveTemplateOverrideForFilename(clientTemplate.filename, resolvedOptions)
        const tpl = addTemplate(ov
          ? { filename: clientTemplate.filename, src: ov.absPath, write: true, options: resolvedOptions }
          : { ...clientTemplate, options: resolvedOptions })
        if (clientTemplate.filename?.endsWith('client/plugin.ts') || clientTemplate.filename?.endsWith('client/plugin'))
          clientPluginDst = tpl.dst
      }

      // In remote mode, the Feathers transport plugin must be client-only.
      // This avoids creating remote transports during SSR and aligns with the
      // official Feathers/Feathers-Pinia Nuxt plugin pattern.
      addPlugin({
        order: 20,
        src: clientPluginDst ?? resolver.resolve(resolvedOptions.templateDir, 'client/plugin.ts'),
        ...(mode === 'remote' ? { mode: 'client' as const } : {}),
      })
    }

    // Devtools: expose resolved config for diagnostics
    nuxt.hook('mcp:setup' as any, ({ mcp }: any) => {
      mcp.tool('get-feathers-config', 'Get the Feathers config', {}, async () => {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ mode, serverEnabled, ...resolvedOptions }, null, 2),
          }],
        }
      })
    })
  },
})
