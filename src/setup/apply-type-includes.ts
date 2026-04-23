import type { Nuxt } from '@nuxt/schema'
import type { ResolvedOptions } from '../runtime/options'

import { createResolver } from '@nuxt/kit'

import { dedupeStrings } from './utils'

interface MinimalNitroConfig {
  typescript?: {
    tsConfig?: {
      include?: string[]
    }
  }
}

export function applyTypeIncludes(options: ResolvedOptions, nuxt: Nuxt): void {
  const resolver = createResolver(import.meta.url)
  const servicesDirs = (options.servicesDirs || []).map(dir => resolver.resolve(dir, '**/*.ts'))
  const includeGlobs = [...servicesDirs]

  nuxt.hook('prepare:types', ({ tsConfig }) => {
    tsConfig.include = dedupeStrings([...(tsConfig.include || []), ...includeGlobs])
  })

  ;(nuxt as any).hook('nitro:config', (nitroConfig: MinimalNitroConfig) => {
    nitroConfig.typescript ||= {}
    nitroConfig.typescript.tsConfig ||= {}
    nitroConfig.typescript.tsConfig.include = dedupeStrings([
      ...(nitroConfig.typescript.tsConfig.include || []),
      ...includeGlobs,
    ])
  })
}
