# Redis et Valkey avec le cache NFZ

NFZ 6.9.0 Patch075 fournit un cache serveur natif avec deux providers : `memory` et `redis`. Le provider `redis` utilise le même contrat avec **Redis** et **Valkey**.

## Installation

Le client Redis reste optionnel pour ne rien imposer aux projets qui utilisent seulement `memory` :

```bash
bun add ioredis
```

## Configuration

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

`REDIS_URL` est une configuration **serveur uniquement**. Ne placez jamais l'URL, le mot de passe ou un token Redis dans `runtimeConfig.public`.

## Utiliser le cache côté serveur

```ts
import { getNfzCache } from 'nuxt-feathers-zod/server-cache'

const cache = getNfzCache(app)
const summary = await cache?.getOrSet('dashboard:summary:v1', async () => {
  return await buildDashboardSummary()
}, { ttlMs: 30_000 })
```

`getOrSet()` déduplique les producteurs concurrents pour une clé **dans le même processus Node uniquement**. Il ne constitue pas un verrou distribué entre plusieurs replicas.

## Comportement distribué

Les valeurs sont sérialisées avant stockage afin d'aligner les providers. Un TTL positif utilise l'expiration Redis/Valkey ; `0` signifie sans expiration. L'effacement d'un namespace utilise une itération bornée `SCAN` puis `UNLINK` et n'utilise pas `KEYS`.

Avec `failOpen: true`, une panne du cache ne doit pas rendre le traitement métier indisponible : une lecture devient un miss et une écriture peut échouer sans remplacer la réponse métier. Les diagnostics exposent le provider, l'état et la latence éventuelle, mais jamais l'URL, les credentials, les clés ou les valeurs. Pour le provider distribué, `entries` vaut `null` : lire les diagnostics ne parcourt jamais implicitement le keyspace Redis/Valkey.

## Authentification et isolation

Vérifiez l'autorisation avant de lire une valeur protégée. Ne mettez pas un JWT dans une clé. Si la réponse dépend d'un utilisateur ou d'un tenant, partitionnez explicitement la clé et n'utilisez pas un cache partagé non isolé.

## Exemple complet DaisyUiKit

`examples/real-world-nuxt4-daisyui-pinia-redis/` utilise directement `feathers.cache.provider = 'redis'`. Son dashboard récupère le cache NFZ attaché à l'application Feathers avec `getNfzCache(app)` ; il n'utilise plus un second cache Nitro/Unstorage.

Le provider a été conçu pour le même protocole Redis et le gate Patch075 exécute le même contrat réel contre Redis et Valkey avant promotion de la capability distribuée.
