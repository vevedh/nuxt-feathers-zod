import type { Nuxt } from '@nuxt/schema'
import type { ClientOptions } from '../runtime/options/client'
import type { ResolvedOptions } from '../runtime/options'

import { addImports, addPlugin, addTemplate, createResolver } from '@nuxt/kit'

import { detectResolvedMode, isResolvedRemoteAuthEnabled, isResolvedServerEnabled } from '../runtime/options/mode'
import { getClientTemplates } from '../runtime/templates/client'
import { resolveTemplateOverrideForFilename } from '../runtime/templates/overrides'
import { resolveRuntimePath } from './runtime-path'
import { dedupeStrings } from './utils'
import { ensurePinia } from './internals/ensure-pinia'

const FEATHERS_CLIENT_CORE_DEPS = [
  '@feathersjs/feathers',
  '@feathersjs/errors',
  '@feathersjs/commons',
  '@feathersjs/authentication-client',
  '@feathersjs/rest-client',
  '@feathersjs/socketio-client',
] as const

const FEATHERS_CLIENT_TARBALL_CJS_DEPS = FEATHERS_CLIENT_CORE_DEPS.map(
  dep => `nuxt-feathers-zod > ${dep}`,
)

const FEATHERS_CLIENT_VITE_COMPAT_DEPS = [
  ...FEATHERS_CLIENT_CORE_DEPS,
  ...FEATHERS_CLIENT_TARBALL_CJS_DEPS,
] as const

const FEATHERS_CLIENT_VITE_NEEDS_INTEROP = [
  ...FEATHERS_CLIENT_CORE_DEPS,
  ...FEATHERS_CLIENT_TARBALL_CJS_DEPS,
] as const

const FEATHERS_PINIA_TARBALL_CJS_DEPS = FEATHERS_CLIENT_CORE_DEPS.map(
  dep => `feathers-pinia > ${dep}`,
)

const FEATHERS_PINIA_VITE_COMPAT_DEPS = [
  'feathers-pinia',
  ...FEATHERS_CLIENT_VITE_COMPAT_DEPS,
  ...FEATHERS_PINIA_TARBALL_CJS_DEPS,
] as const

const FEATHERS_PINIA_VITE_NEEDS_INTEROP = [
  'feathers-pinia',
  ...FEATHERS_CLIENT_VITE_NEEDS_INTEROP,
  ...FEATHERS_PINIA_TARBALL_CJS_DEPS,
] as const

function mergeStringList(current: unknown, additions: readonly string[]): string[] {
  const values = Array.isArray(current)
    ? current.filter((value): value is string => typeof value === 'string')
    : []

  return dedupeStrings([...values, ...additions])
}

function applyViteCompat(
  nuxt: Nuxt,
  deps: readonly string[],
  interopDeps: readonly string[],
): void {
  const nuxtOptions = nuxt.options as any

  nuxtOptions.vite ||= {}
  nuxtOptions.vite.optimizeDeps ||= {}
  nuxtOptions.vite.optimizeDeps.include = mergeStringList(
    nuxtOptions.vite.optimizeDeps.include,
    deps,
  )

  nuxtOptions.vite.optimizeDeps.needsInterop = mergeStringList(
    nuxtOptions.vite.optimizeDeps.needsInterop,
    interopDeps,
  )

  nuxtOptions.vite.resolve ||= {}
  nuxtOptions.vite.resolve.dedupe = mergeStringList(
    nuxtOptions.vite.resolve.dedupe,
    deps,
  )

  nuxtOptions.vite.build ||= {}
  nuxtOptions.vite.build.commonjsOptions ||= {}
  nuxtOptions.vite.build.commonjsOptions.transformMixedEsModules = true

  nuxtOptions.build ||= {}
  nuxtOptions.build.transpile = mergeStringList(
    nuxtOptions.build.transpile,
    deps,
  )

  nuxt.hook('vite:extendConfig', (config) => {
    const viteConfig = config as any
    viteConfig.optimizeDeps ||= {}
    viteConfig.optimizeDeps.include = mergeStringList(
      viteConfig.optimizeDeps.include,
      deps,
    )

    viteConfig.optimizeDeps.needsInterop = mergeStringList(
      viteConfig.optimizeDeps.needsInterop,
      interopDeps,
    )

    viteConfig.resolve ||= {}
    viteConfig.resolve.dedupe = mergeStringList(
      viteConfig.resolve.dedupe,
      deps,
    )

    viteConfig.build ||= {}
    viteConfig.build.commonjsOptions ||= {}
    viteConfig.build.commonjsOptions.transformMixedEsModules = true
  })
}

function applyFeathersClientViteCompat(nuxt: Nuxt): void {
  applyViteCompat(nuxt, FEATHERS_CLIENT_VITE_COMPAT_DEPS, FEATHERS_CLIENT_VITE_NEEDS_INTEROP)
}

function applyFeathersPiniaViteCompat(nuxt: Nuxt): void {
  applyViteCompat(nuxt, FEATHERS_PINIA_VITE_COMPAT_DEPS, FEATHERS_PINIA_VITE_NEEDS_INTEROP)
}

export async function applyClientLayer(options: ResolvedOptions, nuxt: Nuxt): Promise<void> {
  if (!options.client)
    return

  const resolver = createResolver(import.meta.url)
  const runtime = (path: string): string => resolveRuntimePath(resolver, path)
  const mode = detectResolvedMode(options)
  const serverEnabled = isResolvedServerEnabled(options)
  const clientOptions = options.client as ClientOptions
  const piniaEnabled = clientOptions.pinia !== false && Boolean(clientOptions.pinia)

  // The standard NFZ browser client is native and must not force
  // @feathersjs/* CJS packages into Vite browser graph. Feathers-Pinia
  // interop hints are applied only when the optional Feathers-Pinia layer
  // is explicitly enabled.

  if (piniaEnabled) {
    // Feathers-Pinia is an explicit opt-in layer. Only then do we add
    // @pinia/nuxt and Vite interop hints for feathers-pinia. Standard NFZ
    // clients and the auth runtime must not force feathers-pinia into the
    // browser graph.
    applyFeathersPiniaViteCompat(nuxt)
    await ensurePinia(clientOptions, nuxt)
  }

  const enableAuthBootstrap = Boolean(
    (options.auth && serverEnabled)
    || isResolvedRemoteAuthEnabled(options),
  )

  if (enableAuthBootstrap) {
    addImports({ from: runtime('stores/auth'), name: 'useAuthStore' })
    addPlugin({ order: 21, src: runtime('plugins/feathers-auth') })
  }

  if (options.keycloak) {
    addPlugin({
      order: 22,
      src: runtime('plugins/keycloak-sso'),
      mode: 'client',
    })
  }

  let clientPluginDst: string | undefined
  for (const clientTemplate of getClientTemplates(options, resolver)) {
    const override = resolveTemplateOverrideForFilename(clientTemplate.filename, options)
    const templateInput = (override
      ? { filename: clientTemplate.filename, src: override.absPath, write: true, options }
      : { ...clientTemplate, options }) as any
    const template = addTemplate(templateInput)

    if (clientTemplate.filename?.endsWith('client/plugin.ts') || clientTemplate.filename?.endsWith('client/plugin'))
      clientPluginDst = template.dst
  }

  addPlugin({
    order: 20,
    src: clientPluginDst ?? resolver.resolve(options.templateDir, 'client/plugin.ts'),
    ...(mode === 'remote' ? { mode: 'client' as const } : {}),
  })
}
