import type { ResolvedCacheOptions } from '../options/cache'
import type { NfzCacheStore } from './cache'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryCacheStore, createNfzCache, normalizeNfzCacheKey } from './cache'

const defaults: ResolvedCacheOptions = {
  enabled: true,
  provider: 'memory',
  namespace: 'nfz-test',
  defaultTtlMs: 1_000,
  maxEntries: 2,
  failOpen: true,
}

afterEach(() => {
  vi.useRealTimers()
})

describe('native memory cache', () => {
  it('stores values, expires TTL entries and accepts null', async () => {
    vi.useFakeTimers()
    const cache = createNfzCache(defaults)
    expect(await cache.set('message:1', { text: 'hello' }, { ttlMs: 50 })).toBe(true)
    expect(await cache.get('message:1')).toEqual({ text: 'hello' })
    expect(await cache.set('nullable', null, { ttlMs: 0 })).toBe(true)
    expect(await cache.get('nullable')).toBeNull()
    await vi.advanceTimersByTimeAsync(51)
    expect(await cache.get('message:1')).toBeUndefined()
    expect(await cache.get('nullable')).toBeNull()
  })

  it('keeps the memory store bounded using insertion order eviction', async () => {
    const cache = createNfzCache(defaults)
    await cache.set('first', 1)
    await cache.set('second', 2)
    await cache.set('third', 3)
    expect(await cache.get('first')).toBeUndefined()
    expect(await cache.get('second')).toBe(2)
    expect(await cache.get('third')).toBe(3)
    expect((await cache.diagnostics()).entries).toBe(2)
  })

  it('deduplicates concurrent getOrSet producers', async () => {
    const cache = createNfzCache(defaults)
    let produced = 0
    let release!: () => void
    const wait = new Promise<void>((resolve) => { release = resolve })
    const producer = async () => {
      produced += 1
      await wait
      return { id: 1 }
    }
    const first = cache.getOrSet('single-flight', producer)
    const second = cache.getOrSet('single-flight', producer)
    release()
    await expect(Promise.all([first, second])).resolves.toEqual([{ id: 1 }, { id: 1 }])
    expect(produced).toBe(1)
  })

  it('fails open for backend errors but can fail closed', async () => {
    const failingStore: NfzCacheStore = {
      async get() { throw new Error('backend unavailable') },
      async set() { throw new Error('backend unavailable') },
      async remove() { throw new Error('backend unavailable') },
      async clear() { throw new Error('backend unavailable') },
      async has() { throw new Error('backend unavailable') },
      async size() { throw new Error('backend unavailable') },
      async close() { throw new Error('backend unavailable') },
    }
    const openCache = createNfzCache(defaults, failingStore)
    expect(await openCache.get('key')).toBeUndefined()
    expect(await openCache.set('key', 'value')).toBe(false)
    expect((await openCache.diagnostics()).stats.errors).toBeGreaterThan(0)

    const closedCache = createNfzCache({ ...defaults, failOpen: false }, failingStore)
    await expect(closedCache.get('key')).rejects.toThrow('backend unavailable')
  })

  it('does not expose cached keys or values through diagnostics', async () => {
    const cache = createNfzCache(defaults)
    await cache.set('secret-looking-key', { token: 'do-not-report' })
    const serialized = JSON.stringify(await cache.diagnostics())
    expect(serialized).not.toContain('secret-looking-key')
    expect(serialized).not.toContain('do-not-report')
  })

  it('reports unknown entry count when a future store cannot provide size cheaply', async () => {
    const store = createMemoryCacheStore({ maxEntries: 10 })
    const withoutSize: NfzCacheStore = { ...store, size: undefined }
    const cache = createNfzCache(defaults, withoutSize)
    expect((await cache.diagnostics()).entries).toBeNull()
  })

  it('validates keys and refuses undefined values', async () => {
    expect(() => normalizeNfzCacheKey('../secret')).toThrow(/Cache key/)
    const cache = createNfzCache(defaults)
    await expect(cache.set('valid', undefined)).rejects.toThrow(/undefined/)
    await expect(cache.getOrSet('valid', () => undefined)).rejects.toThrow(/undefined/)
  })

  it('supports prefix clearing within its namespace', async () => {
    const store = createMemoryCacheStore({ maxEntries: 10 })
    const cache = createNfzCache({ ...defaults, maxEntries: 10 }, store)
    await cache.set('users:1', 1)
    await cache.set('users:2', 2)
    await cache.set('messages:1', 3)
    expect(await cache.clear('users:')).toBe(2)
    expect(await cache.has('users:1')).toBe(false)
    expect(await cache.get('messages:1')).toBe(3)
  })
})
