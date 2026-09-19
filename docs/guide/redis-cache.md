# Redis cache avec NFZ

NFZ 6.8.0 introduit avec Patch073 r1 une **fondation de cache native serveur** avec le provider `memory`. Redis n'est volontairement pas encore un provider natif NFZ : l'intégration Redis reste, pour cette révision, une responsabilité applicative via Nitro/Unstorage.

Cette séparation permet de stabiliser d'abord le contrat `NfzCacheStore`, les TTL, le fail-open, `getOrSet` single-flight et les diagnostics sans ajouter prématurément une dépendance Redis au module.

## Architecture recommandée

```txt
Nuxt UI / Pinia
   │
   ├─ client NFZ embedded / JWT
   │       │
   │       └─ services Feathers v5 -> MongoDB / SQL
   │
   └─ routes serveur / agrégats
           │
           └─ Nitro Storage -> Redis
```

Deux usages sont complémentaires :

- **cache de routes/agrégats Nuxt** : `useStorage()` ou `routeRules` avec un stockage Redis ;
- **cache métier Feathers** : hook ou service applicatif qui lit/écrit Redis, avec invalidation sur `create`, `patch`, `update` et `remove`.

## Installation

Pour un montage Redis explicite avec Unstorage :

```bash
bun add unstorage ioredis
```

`ioredis` doit rester compatible avec la version attendue par Unstorage/Nitro. Dans l'exemple maintenu 6.8.0, `ioredis` reste épinglé sur la branche 5.x utilisée par Nitro 2.13.4.

## Configuration privée

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

Ne place jamais `REDIS_URL`, un mot de passe ou un token Redis dans `runtimeConfig.public`.

## Monter Redis dans Nitro

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

Le stockage devient ensuite accessible avec :

```ts
const cache = useStorage('nfz-cache')

await cache.setItem('dashboard:summary:v1', payload, { ttl: 60 })
const cached = await cache.getItem('dashboard:summary:v1')
```

## Cache et authentification

Une route protégée doit vérifier le JWT **avant** de lire une valeur qui ne doit être accessible qu'à un utilisateur authentifié.

Pour un cache partagé :

- ne stocke pas le JWT dans la clé ;
- ne stocke pas de profil utilisateur ou de donnée personnelle sans partitionnement par sujet/tenant ;
- versionne les clés (`dashboard:summary:v1`) ;
- utilise un TTL borné ;
- invalide après mutation métier ;
- garde un comportement déterministe si Redis est temporairement indisponible.

## Cache d'un service métier

Pour un service Feathers, le cache doit être placé autour d'une lecture coûteuse et invalidé lorsque la ressource change. Exemple de stratégie :

```txt
find/get -> lookup Redis -> miss -> service/DB -> Redis SET + TTL
create/patch/update/remove -> service/DB -> DEL des clés concernées
```

Évite de cacher aveuglément les résultats contenant des champs dépendants de `params.user`, `params.provider`, du tenant ou des permissions RBAC.

## Exemple complet DaisyUiKit

Le dépôt contient maintenant :

```txt
examples/real-world-nuxt4-daisyui-pinia-redis/
```

Il fournit :

- Nuxt 4 + Vue 3 ;
- `daisy-ui-kit/nuxt` + DaisyUI/Tailwind CSS 4 ;
- Pinia ;
- MongoDB 7 ;
- FeathersJS v5 embedded via NFZ ;
- authentification locale/JWT ;
- RBAC `admin/member` ;
- Redis monté avec Nitro/Unstorage ;
- dashboard protégé avec agrégat cache Redis ;
- light/dark et thèmes personnalisables.

La page d'accueil de l'exemple sert aussi de page de promotion de cette architecture.

## Ce que fournit déjà le cache natif r1

Pour un cache mémoire local au processus, activez directement NFZ :

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

Les services/plugins serveur peuvent récupérer le cache avec `getNfzCache(app)` depuis `nuxt-feathers-zod/server-cache`. Le contrat expose `get`, `set`, `remove`, `clear`, `has`, `getOrSet`, `diagnostics` et `close`.

## Pourquoi Redis reste applicatif en r1 ?

La révision r1 stabilise l'abstraction et le provider mémoire avant d'ajouter un backend réseau. Le provider Redis/Valkey natif doit encore définir et certifier la connexion, le reconnect/fail-open, le TTL distribué, l'isolation namespace/tenant, l'observabilité et les tests Docker multi-instance. Jusqu'à cette révision, `provider: 'redis'` est explicitement rejeté afin d'éviter une capacité partiellement fonctionnelle.

<!-- release-version: 6.8.0 -->
