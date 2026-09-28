import { describe, expect, it } from 'vitest'
import { NFZ_CACHE_DEFAULTS, resolveCacheOptions } from './cache'

describe('cache options', () => {
  it('stays disabled by default', () => {
    expect(resolveCacheOptions(undefined)).toBe(false)
    expect(resolveCacheOptions(false)).toBe(false)
    expect(resolveCacheOptions({ enabled: false })).toBe(false)
  })

  it('resolves safe memory defaults when enabled', () => {
    expect(resolveCacheOptions(true)).toEqual({
      enabled: true,
      provider: 'memory',
      namespace: NFZ_CACHE_DEFAULTS.namespace,
      defaultTtlMs: NFZ_CACHE_DEFAULTS.defaultTtlMs,
      maxEntries: NFZ_CACHE_DEFAULTS.maxEntries,
      failOpen: true,
    })
  })

  it('accepts bounded explicit settings', () => {
    expect(resolveCacheOptions({
      provider: 'memory',
      namespace: 'tenant_1:messages',
      defaultTtlMs: 0,
      maxEntries: 42,
      failOpen: false,
    })).toMatchObject({
      provider: 'memory',
      namespace: 'tenant_1:messages',
      defaultTtlMs: 0,
      maxEntries: 42,
      failOpen: false,
    })
  })

  it('resolves a private bounded Redis/Valkey contract without exposing credentials', () => {
    expect(resolveCacheOptions({
      provider: 'redis',
      namespace: 'tenant_1:messages',
      redis: { url: 'rediss://cache-user:secret@example.invalid:6380/2' },
    })).toMatchObject({
      provider: 'redis',
      namespace: 'tenant_1:messages',
      redis: {
        protocol: 'rediss',
        connectTimeoutMs: 2_000,
        commandTimeoutMs: 2_000,
        maxReconnectAttempts: 3,
      },
    })
  })

  it('rejects invalid Redis URLs, unsafe bounds and memory-only settings', () => {
    expect(() => resolveCacheOptions({ provider: 'redis', redis: { url: 'https://example.invalid' } })).toThrow(/redis:\/\//i)
    expect(() => resolveCacheOptions({ provider: 'redis', redis: { url: '' } })).toThrow(/required/i)
    expect(() => resolveCacheOptions({ namespace: '../secret' })).toThrow(/cache\.namespace/)
    expect(() => resolveCacheOptions({ defaultTtlMs: -1 })).toThrow(/defaultTtlMs/)
    expect(() => resolveCacheOptions({ maxEntries: 0 })).toThrow(/maxEntries/)
    expect(() => resolveCacheOptions({ maxEntries: 100_001 })).toThrow(/maxEntries/)
  })
})
