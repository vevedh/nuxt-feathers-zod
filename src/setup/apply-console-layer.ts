import type { ResolvedOptions } from '../runtime/options'

import { addServerHandler, createResolver } from '@nuxt/kit'

import { resolveRuntimePath } from './runtime-path'

export interface NfzConsoleServerHandlerSpec {
  route: string
  method: 'get' | 'post'
  runtimePath: string
}

export const NFZ_CONSOLE_SERVER_HANDLERS: readonly NfzConsoleServerHandlerSpec[] = [
  { route: '/api/nfz/services', method: 'get', runtimePath: 'server/api/nfz/services.get' },
  { route: '/api/nfz/manifest', method: 'get', runtimePath: 'server/api/nfz/manifest.get' },
  { route: '/api/nfz/manifest', method: 'post', runtimePath: 'server/api/nfz/manifest.post' },
  { route: '/api/nfz/schema', method: 'get', runtimePath: 'server/api/nfz/schema.get' },
  { route: '/api/nfz/schema', method: 'post', runtimePath: 'server/api/nfz/schema.post' },
  { route: '/api/nfz/schema/:service', method: 'get', runtimePath: 'server/api/nfz/schema/[service].get' },
  { route: '/api/nfz/schema/:service', method: 'post', runtimePath: 'server/api/nfz/schema/[service].post' },
  { route: '/api/nfz/preview', method: 'post', runtimePath: 'server/api/nfz/preview.post' },
  { route: '/api/nfz/apply', method: 'post', runtimePath: 'server/api/nfz/apply.post' },
  { route: '/api/nfz/status', method: 'get', runtimePath: 'server/api/nfz/status.get' },
  { route: '/api/nfz/rbac', method: 'get', runtimePath: 'server/api/nfz/rbac.get' },
  { route: '/api/nfz/rbac', method: 'post', runtimePath: 'server/api/nfz/rbac.post' },
  { route: '/api/nfz/presets', method: 'get', runtimePath: 'server/api/nfz/presets.get' },
  { route: '/api/nfz/presets/preview', method: 'post', runtimePath: 'server/api/nfz/presets/preview.post' },
  { route: '/api/nfz/presets/apply', method: 'post', runtimePath: 'server/api/nfz/presets/apply.post' },
  { route: '/api/nfz/init/add-users', method: 'post', runtimePath: 'server/api/nfz/init/add-users.post' },
] as const

/**
 * Register deprecated Nitro compatibility facades only when explicitly enabled.
 *
 * The canonical API is implemented by Feathers services under `nfz/*`. These handlers
 * remain thin, deprecated facades so applications using `/api/nfz/**` keep working
 * throughout the 6.x line.
 */
export function applyConsoleLayer(options: ResolvedOptions): void {
  if (!options.console?.enabled || options.console.legacyNitroRoutes === false)
    return

  const resolver = createResolver(import.meta.url)

  for (const spec of NFZ_CONSOLE_SERVER_HANDLERS) {
    addServerHandler({
      route: spec.route,
      method: spec.method,
      handler: resolveRuntimePath(resolver, spec.runtimePath),
    })
  }
}
