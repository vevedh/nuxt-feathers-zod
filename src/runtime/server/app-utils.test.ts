import type { ResolvedCacheOptions } from '../options/cache'
import { describe, expect, it, vi } from 'vitest'
import { configureNfzInfrastructure } from './app-utils'

const cacheOptions: ResolvedCacheOptions = {
  enabled: true,
  provider: 'memory',
  namespace: 'infra-test',
  defaultTtlMs: 60_000,
  maxEntries: 10,
  failOpen: true,
}

function createApp() {
  const settings = new Map<string, unknown>()
  return {
    settings,
    app: {
      get: vi.fn((key: string) => settings.get(key)),
      set: vi.fn((key: string, value: unknown) => settings.set(key, value)),
    },
  }
}

describe('configureNfzInfrastructure', () => {
  it('initializes native cache before auth and database handlers', async () => {
    const calls: string[] = []
    const { app, settings } = createApp()

    await configureNfzInfrastructure(app, {
      cache: cacheOptions,
      auth: { enabled: true },
      database: { connections: { default: { enabled: true } } },
    }, {
      authentication: async (target) => {
        expect(target.get('nfzCache')).toBeDefined()
        calls.push('auth')
      },
      database: async (target) => {
        expect(target.get('nfzCache')).toBeDefined()
        calls.push('database')
      },
    })

    expect(settings.get('nfzCache')).toBeDefined()
    expect(calls).toEqual(['auth', 'database'])
  })

  it('does not create cache state while disabled', async () => {
    const { app, settings } = createApp()
    await configureNfzInfrastructure(app, { cache: false, auth: { enabled: false } }, {})
    expect(settings.has('nfzCache')).toBe(false)
  })
})
