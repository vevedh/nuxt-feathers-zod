import type { Nuxt } from '@nuxt/schema'
import type { ResolvedOptions } from '../runtime/options'

import { setupNfzDevtools } from '../devtools'

export function applyDevtoolsLayer(
  nuxt: Nuxt,
  options: ResolvedOptions,
  servicesDetected: Array<{ name: string, from: string }>,
): void {
  if (!nuxt.options.dev || !options.devtools)
    return

  setupNfzDevtools(nuxt, options, { servicesDetected })
}
