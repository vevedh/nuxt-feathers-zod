import { describe, expect, it } from 'vitest'

import { ensureNitroDependencyInline } from './ensure-nitro-inline'

describe('ensureNitroDependencyInline', () => {
  it('creates the Nitro externals inline list', () => {
    const config = {}

    ensureNitroDependencyInline(config, 'zod')

    expect(config).toEqual({ externals: { inline: ['zod'] } })
  })

  it('preserves existing inline entries and avoids duplicates', () => {
    const matcher = /^local-runtime\//
    const config = { externals: { inline: [matcher, 'zod'] } }

    ensureNitroDependencyInline(config, 'zod')

    expect(config.externals.inline).toEqual([matcher, 'zod'])
  })

  it('replaces an explicit false value with the required runtime peer', () => {
    const config = { externals: { inline: false } }

    ensureNitroDependencyInline(config, 'zod')

    expect(config.externals.inline).toEqual(['zod'])
  })

  it('keeps an all-inline Nitro configuration unchanged', () => {
    const config = { externals: { inline: true } }

    ensureNitroDependencyInline(config, 'zod')

    expect(config.externals.inline).toBe(true)
  })
})
