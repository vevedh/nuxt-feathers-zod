import type { ResolvedCacheOptions } from '../options/cache'
import type { NfzCacheStore } from './cache'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryCacheStore, createNfzCache, createRedisCacheStore, normalizeNfzCacheKey } from './cache'

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

  it('supports provider-neutral diagnostics with an injected Redis/Valkey store contract', async () => {
    const values = new Map<string, unknown>()
    const redisStore: NfzCacheStore = {
      provider: 'redis',
      async get(key) { return values.get(key) },
      async set(key, value) { values.set(key, value) },
      async remove(key) { return values.delete(key) },
      async clear(prefix) {
        let removed = 0
        for (const key of [...values.keys()]) {
          if (!prefix || key.startsWith(prefix)) {
            values.delete(key)
            removed += 1
          }
        }
        return removed
      },
      async has(key) { return values.has(key) },
      async health() { return { status: 'ready', latencyMs: 1 } },
      async close() { values.clear() },
    }
    const redisOptions: ResolvedCacheOptions = {
      enabled: true,
      provider: 'redis',
      namespace: 'nfz-redis-test',
      defaultTtlMs: 1_000,
      failOpen: true,
      redis: {
        url: 'redis://user:secret@example.invalid:6379/0',
        protocol: 'redis',
        connectTimeoutMs: 2_000,
        commandTimeoutMs: 2_000,
        maxReconnectAttempts: 3,
      },
    }
    const cache = createNfzCache(redisOptions, redisStore)
    await cache.set('message:1', { text: 'hello' })
    expect(await cache.get('message:1')).toEqual({ text: 'hello' })
    const diagnostics = await cache.diagnostics()
    expect(diagnostics.provider).toBe('redis')
    expect(diagnostics.maxEntries).toBeNull()
    expect(diagnostics.health.status).toBe('ready')
    expect(JSON.stringify(diagnostics)).not.toContain('secret')
    expect(JSON.stringify(diagnostics)).not.toContain('example.invalid')
  })

  it('rejects a store whose provider disagrees with the resolved cache provider', () => {
    const memoryStore = createMemoryCacheStore({ maxEntries: 10 })
    const redisOptions: ResolvedCacheOptions = {
      enabled: true,
      provider: 'redis',
      namespace: 'nfz',
      defaultTtlMs: 1_000,
      failOpen: true,
      redis: {
        url: 'redis://example.invalid:6379/',
        protocol: 'redis',
        connectTimeoutMs: 2_000,
        commandTimeoutMs: 2_000,
        maxReconnectAttempts: 3,
      },
    }
    expect(() => createNfzCache(redisOptions, memoryStore)).toThrow(/does not match/)
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

describe('native Redis/Valkey cache store', () => {
  const redisOptions: Extract<ResolvedCacheOptions, { provider: 'redis' }> = {
    enabled: true,
    provider: 'redis',
    namespace: 'nfz-redis-test',
    defaultTtlMs: 1_000,
    failOpen: false,
    redis: {
      url: 'redis://user:secret@127.0.0.1:6379/0',
      protocol: 'redis',
      connectTimeoutMs: 100,
      commandTimeoutMs: 100,
      maxReconnectAttempts: 2,
    },
  }

  class FakeRedis {
    static last: FakeRedis | undefined
    status = 'wait'
    readonly values = new Map<string, string>()
    readonly expirations = new Map<string, number>()
    readonly commands: string[] = []

    constructor(_url: string, _options: Record<string, unknown>) {
      FakeRedis.last = this
    }

    on() { return this }
    async connect() { this.status = 'ready' }
    async get(key: string) { return this.values.get(key) ?? null }
    async set(key: string, value: string, ...args: Array<string | number>) {
      this.values.set(key, value)
      if (args[0] === 'PX')
        this.expirations.set(key, Number(args[1]))
      return 'OK'
    }

    async del(key: string) { return this.values.delete(key) ? 1 : 0 }
    async exists(key: string) { return this.values.has(key) ? 1 : 0 }
    async ping() { return 'PONG' }
    async scan(_cursor: string, ...args: Array<string | number>): Promise<[string, string[]]> {
      this.commands.push('SCAN')
      const match = String(args[args.indexOf('MATCH') + 1] ?? '*').replace(/\*$/, '')
      return ['0', [...this.values.keys()].filter(key => key.startsWith(match))]
    }

    async unlink(...keys: string[]) {
      this.commands.push('UNLINK')
      let removed = 0
      for (const key of keys)
        removed += this.values.delete(key) ? 1 : 0
      return removed
    }

    async quit() { this.status = 'end'; return 'OK' }
    disconnect() { this.status = 'end' }
  }

  it('serializes values, applies PX TTL and round-trips null', async () => {
    const store = createRedisCacheStore(redisOptions, FakeRedis)
    await store.set('nfz-redis-test:item', { nested: ['value'] }, { ttlMs: 250 })
    await store.set('nfz-redis-test:null', null, { ttlMs: 0 })
    await expect(store.get('nfz-redis-test:item')).resolves.toEqual({ nested: ['value'] })
    await expect(store.get('nfz-redis-test:null')).resolves.toBeNull()
    expect(FakeRedis.last?.expirations.get('nfz-redis-test:item')).toBe(250)
    expect(FakeRedis.last?.values.get('nfz-redis-test:item')).toContain('"version":1')
  })

  it('keeps Redis diagnostics keyspace-free and reports an unknown entry count', async () => {
    const store = await createRedisCacheStore(redisOptions, FakeRedis as never)
    const cache = createNfzCache(redisOptions, store)
    const diagnostics = await cache.diagnostics()

    expect(diagnostics.entries).toBeNull()
    expect(diagnostics.provider).toBe('redis')
    expect(FakeRedis.last?.commands).not.toContain('PING')
    expect(FakeRedis.last?.commands).not.toContain('SCAN')
    await cache.close()
  })

  it('invalidates with SCAN plus UNLINK and never KEYS', async () => {
    const store = createRedisCacheStore(redisOptions, FakeRedis)
    await store.set('nfz-redis-test:a', 1)
    await store.set('nfz-redis-test:b', 2)
    await store.set('other:c', 3)
    await expect(store.clear('nfz-redis-test:')).resolves.toBe(2)
    expect(FakeRedis.last?.commands).toContain('SCAN')
    expect(FakeRedis.last?.commands).toContain('UNLINK')
    expect(FakeRedis.last?.commands).not.toContain('KEYS')
    await expect(store.has('other:c')).resolves.toBe(true)
  })

  it('reports health and closes the connection', async () => {
    const store = createRedisCacheStore(redisOptions, FakeRedis)
    await expect(store.health?.()).resolves.toMatchObject({ status: 'ready' })
    await store.close()
    expect(FakeRedis.last?.status).toBe('end')
  })

  it('makes memory values mutation-isolated like serialized distributed values', async () => {
    const cache = createNfzCache(defaults)
    const source = { nested: { count: 1 } }
    await cache.set('isolated', source)
    source.nested.count = 2
    const first = await cache.get<typeof source>('isolated')
    expect(first?.nested.count).toBe(1)
    if (first)
      first.nested.count = 3
    expect((await cache.get<typeof source>('isolated'))?.nested.count).toBe(1)
  })
})
