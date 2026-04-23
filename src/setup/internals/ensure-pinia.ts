import type { Nuxt } from '@nuxt/schema'
import type { ClientOptions } from '../../runtime/options/client'
import type { PiniaModuleOptions } from '../../runtime/options/client/pinia'

import { createRequire } from 'node:module'
import { hasNuxtModule } from '@nuxt/kit'
import { consola } from 'consola'

/**
 * Pinia module alignment (best effort).
 * If @pinia/nuxt is installed but not activated, register it in Nuxt modules.
 * If it is missing, emit an actionable DX warning without side effects.
 */
export async function ensurePinia(client: ClientOptions, nuxt: Nuxt): Promise<void> {
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
