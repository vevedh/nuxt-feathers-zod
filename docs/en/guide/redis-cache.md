# Redis cache with NFZ

NFZ 6.8.0 Patch073 r1 introduces a **server-native cache foundation** with the `memory` provider. Redis is deliberately not a native NFZ provider yet; this revision keeps Redis integration at the application layer through Nitro/Unstorage.

This lets NFZ stabilize `NfzCacheStore`, TTL semantics, fail-open behavior, single-flight `getOrSet`, and value-free diagnostics before adding a Redis client dependency.

## Recommended architecture

```txt
Nuxt UI / Pinia
   │
   ├─ embedded NFZ client / JWT
   │       │
   │       └─ Feathers v5 services -> MongoDB / SQL
   │
   └─ server routes / aggregates
           │
           └─ Nitro Storage -> Redis
```

Use Redis for route/aggregate caching through `useStorage()` or route rules, and use explicit application hooks when a Feathers business service needs cache-aside behavior.

## Private runtime configuration

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    redis: {
      enabled: process.env.REDIS_ENABLED !== 'false',
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379/0',
      prefix: process.env.REDIS_PREFIX || 'nfz:app',
      ttlSeconds: Number(process.env.REDIS_CACHE_TTL_SECONDS || 60),
    },
  },
})
```

Never place `REDIS_URL`, passwords, or Redis tokens in `runtimeConfig.public`.

## Mount Redis in Nitro

```ts
import redisDriver from 'unstorage/drivers/redis'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  if (config.redis.enabled === false)
    return

  useStorage().mount('nfz-cache', redisDriver({
    url: String(config.redis.url),
    base: String(config.redis.prefix || 'nfz:app'),
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
  }))
})
```

Then use the mount with:

```ts
const cache = useStorage('nfz-cache')
await cache.setItem('dashboard:summary:v1', payload, { ttl: 60 })
const cached = await cache.getItem('dashboard:summary:v1')
```

## Security and invalidation

Authenticate before reading a protected cached value. Keep shared cache entries free of personal data unless they are partitioned by user/tenant and authorization context. Version keys, bound TTLs, invalidate after business mutations, and never include JWTs in cache keys.

For Feathers services, the usual cache-aside contract is:

```txt
find/get -> Redis lookup -> miss -> service/DB -> Redis SET + TTL
create/patch/update/remove -> service/DB -> invalidate affected keys
```

## Complete DaisyUiKit example

The repository now includes:

```txt
examples/real-world-nuxt4-daisyui-pinia-redis/
```

It combines Nuxt 4, Vue 3, `daisy-ui-kit/nuxt`, Tailwind CSS 4, Pinia, MongoDB 7, embedded FeathersJS v5, local/JWT authentication, `admin/member` RBAC, Redis through Nitro/Unstorage, a protected cached dashboard, and switchable light/dark/custom DaisyUI themes.

## What the native r1 cache already provides

For process-local memory caching, enable NFZ directly:

```ts
feathers: {
  cache: {
    enabled: true,
    provider: 'memory',
    defaultTtlMs: 60_000,
    maxEntries: 1_000,
    failOpen: true,
  },
}
```

Server services/plugins can retrieve it with `getNfzCache(app)` from `nuxt-feathers-zod/server-cache`. The stable high-level surface includes `get`, `set`, `remove`, `clear`, `has`, `getOrSet`, `diagnostics`, and `close`.

## Why does Redis stay application-level in r1?

r1 stabilizes the abstraction and in-process provider before introducing a network backend. A native Redis/Valkey provider still needs explicit connection/reconnect semantics, distributed TTL behavior, namespace/tenant isolation, observability, and Docker multi-instance certification. Until that revision, `provider: 'redis'` is explicitly rejected rather than exposing a partially implemented capability.

<!-- release-version: 6.8.0 -->
