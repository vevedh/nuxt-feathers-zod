import type { ResolvedRedisCacheOptions } from '../src/runtime/options/cache'
import { describe, expect, it } from 'vitest'
import { createNfzCache } from '../src/runtime/server/cache'

const targets = [
  ['Redis', process.env.NFZ_TEST_REDIS_URL],
  ['Valkey', process.env.NFZ_TEST_VALKEY_URL],
] as const

for (const [engine, url] of targets) {
  const suite = url ? describe : describe.skip
  suite(`native cache against ${engine}`, () => {
    const options: ResolvedRedisCacheOptions = {
      enabled: true,
      provider: 'redis',
      namespace: `nfz-p075-${engine.toLowerCase()}`,
      defaultTtlMs: 2_000,
      failOpen: false,
      redis: {
        url: url ?? 'redis://127.0.0.1:6379',
        protocol: 'redis',
        connectTimeoutMs: 2_000,
        commandTimeoutMs: 2_000,
        maxReconnectAttempts: 2,
      },
    }

    it('proves CRUD, TTL, namespace invalidation, health and teardown', async () => {
      const cache = createNfzCache(options)
      await cache.clear()
      expect(await cache.set('json', { engine, nested: [1, null, 'ok'] }, { ttlMs: 5_000 })).toBe(true)
      expect(await cache.get('json')).toEqual({ engine, nested: [1, null, 'ok'] })
      expect(await cache.has('json')).toBe(true)
      expect((await cache.diagnostics()).health.status).toBe('ready')
      expect(await cache.remove('json')).toBe(true)
      expect(await cache.get('json')).toBeUndefined()

      await cache.set('ttl', 'expires', { ttlMs: 50 })
      await new Promise(resolve => setTimeout(resolve, 80))
      expect(await cache.get('ttl')).toBeUndefined()

      await cache.set('group:a', 1)
      await cache.set('group:b', 2)
      await cache.set('keep', 3)
      expect(await cache.clear('group:')).toBe(2)
      expect(await cache.get('keep')).toBe(3)
      await cache.clear()
      await cache.close()
    }, 15_000)
  })
}
