# Redis cache with NFZ

NFZ 6.7.51 can be used with Redis in a Nuxt 4 application, but **the module does not currently expose a public `feathers.cache` or `feathers.redis` option**.

The recommended application cache uses Nitro/Unstorage on the server. This keeps Redis credentials private and avoids documenting an NFZ API that does not exist yet.

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

## Why not `feathers.cache` yet?

A first-class NFZ cache contract belongs to the later 6.8.0 design work. It needs an explicit driver contract, TTL/invalidation semantics, observability, multi-instance behavior, security rules, and Redis/Valkey compatibility before becoming a stable public module option.

<!-- release-version: 6.7.51 -->
