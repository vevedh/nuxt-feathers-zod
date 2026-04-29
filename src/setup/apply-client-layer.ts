import type { Nuxt } from '@nuxt/schema'
import type { ClientOptions } from '../runtime/options/client'
import type { ResolvedOptions } from '../runtime/options'

import { addImports, addPlugin, addRouteMiddleware, addTemplate, createResolver } from '@nuxt/kit'

import { detectResolvedMode, isResolvedRemoteAuthEnabled, isResolvedServerEnabled } from '../runtime/options/mode'
import { getClientTemplates } from '../runtime/templates/client'
import { resolveTemplateOverrideForFilename } from '../runtime/templates/overrides'
import { resolveRuntimePath } from './runtime-path'
import { ensurePinia } from './internals/ensure-pinia'


export async function applyClientLayer(options: ResolvedOptions, nuxt: Nuxt): Promise<void> {
  if (!options.client)
    return

  const resolver = createResolver(import.meta.url)
  const runtime = (path: string): string => resolveRuntimePath(resolver, path)
  const mode = detectResolvedMode(options)
  const serverEnabled = isResolvedServerEnabled(options)
  const clientOptions = options.client as ClientOptions
  const piniaEnabled = clientOptions.pinia !== false && Boolean(clientOptions.pinia)

  // The standard NFZ browser client is native and raw Feathers-based.
  // Pinia is used only for explicit application/session stores; no
  // legacy service-store wrapper or service-cache layer is loaded.

  if (piniaEnabled)
    await ensurePinia(clientOptions, nuxt)

  const enableAuthBootstrap = Boolean(
    (options.auth && serverEnabled)
    || isResolvedRemoteAuthEnabled(options),
  )

  if (piniaEnabled)
    addImports({ from: runtime('stores/session'), name: 'useSessionStore' })

  if (enableAuthBootstrap) {
    addImports({ from: runtime('stores/auth'), name: 'useAuthStore' })
    addPlugin({ order: 21, src: runtime('plugins/feathers-auth') })
    addRouteMiddleware({ name: 'session', path: runtime('middleware/session') })
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
