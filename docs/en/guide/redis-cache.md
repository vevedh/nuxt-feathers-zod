# Redis and Valkey with the NFZ cache

NFZ 6.9.0 Patch075 provides a native server-side cache with `memory` and `redis` providers. The `redis` provider uses the same contract with **Redis** and **Valkey**.

## Install

The Redis client remains optional so memory-only projects do not load it:

```bash
bun add ioredis
```

## Configure

```ts
export default defineNuxtConfig({
  feathers: {
    cache: {
      enabled: true,
      provider: 'redis',
      namespace: 'nfz:app',
      defaultTtlMs: 60_000,
      failOpen: true,
      redis: {
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379/0',
        connectTimeoutMs: 2_000,
        commandTimeoutMs: 2_000,
        maxReconnectAttempts: 3,
      },
    },
  },
})
```

`REDIS_URL` is **server-only** configuration. Never expose the URL, password, or token through `runtimeConfig.public`.

## Use the server cache

```ts
import { getNfzCache } from 'nuxt-feathers-zod/server-cache'

const cache = getNfzCache(app)
const summary = await cache?.getOrSet('dashboard:summary:v1', async () => {
  return await buildDashboardSummary()
}, { ttlMs: 30_000 })
```

`getOrSet()` deduplicates concurrent producers for one key **inside one Node process only**. It is not a distributed lock across replicas.

## Distributed behavior

Values are serialized before storage to align provider semantics. A positive TTL uses Redis/Valkey expiry; `0` means no expiry. Namespace clearing uses bounded `SCAN` iteration followed by `UNLINK`; it never uses `KEYS`.

With `failOpen: true`, a cache outage does not replace the business response: reads become misses and writes may fail open. Diagnostics expose provider/health and optional latency, never URLs, credentials, keys, or values. For the distributed provider, `entries` is `null`: reading diagnostics never scans the Redis/Valkey keyspace implicitly.

## Authentication and isolation

Authorize before reading protected cached data. Do not put JWTs in cache keys. Partition keys explicitly when responses depend on a user or tenant.

## Complete DaisyUiKit example

`examples/real-world-nuxt4-daisyui-pinia-redis/` now configures `feathers.cache.provider = 'redis'` directly. Its dashboard gets the NFZ cache attached to the Feathers application through `getNfzCache(app)` and no longer mounts a second Nitro/Unstorage cache.

The Patch075 gate runs the same real-engine contract against Redis and Valkey before the distributed capability is promoted.
