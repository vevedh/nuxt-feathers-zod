import type { Nuxt } from '@nuxt/schema'
import type { ResolvedOptions } from '../runtime/options'

import { resolvePublicRuntimeConfig, resolveRuntimeConfig } from '../runtime/options'

export function applyRuntimeConfig(options: ResolvedOptions, nuxt: Nuxt): void {
  nuxt.options.runtimeConfig._feathers = resolveRuntimeConfig(options)
  nuxt.options.runtimeConfig.public._feathers = resolvePublicRuntimeConfig(options)
}
