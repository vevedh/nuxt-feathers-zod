# Configuration

La configuration se place sous la clé `feathers` de `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

## Options de premier niveau

Les clés ci-dessous correspondent à `ModuleOptions` dans le code du module.

| Option | Type fonctionnel | Rôle |
|---|---|---|
| `transports` | objet | REST et Socket.IO |
| `database` | objet | registre de connexions MongoDB et SQL |
| `cache` | booléen ou objet | cache natif serveur ; `false` par défaut, provider `memory` en Patch073 r1 |
| `servicesDirs` | chaîne ou liste | dossiers de découverte des services |
| `server` | objet | serveur Feathers embedded, modules et sécurité |
| `auth` | booléen ou objet | authentification locale/JWT |
| `keycloak` | booléen ou objet | client Keycloak et bridge serveur |
| `client` | booléen ou objet | mode `embedded` ou `remote` |
| `validator` | objet | formats du validateur |
| `loadFeathersConfig` | booléen | chargement de la configuration Feathers historique |
| `swagger` | booléen ou objet | intégration Swagger historique |
| `templates` | objet | templates personnalisés et allow-list |
| `devtools` | booléen | intégration DevTools NFZ |
| `console` | booléen ou objet | services NFZ Builder/RBAC et façades historiques |

## `client`

### Embedded

```ts
feathers: {
  client: {
    mode: 'embedded',
  },
}
```

### Remote

```ts
feathers: {
  client: {
    mode: 'remote',
    remote: {
      url: 'https://api.example.test',
      transport: 'socketio',
      restPath: '/feathers',
      websocketPath: '/socket.io',
      auth: {
        enabled: true,
        servicePath: 'authentication',
        payloadMode: 'jwt',
        strategy: 'jwt',
        tokenField: 'accessToken',
        reauth: true,
      },
      services: [
        { path: 'users' },
        { path: 'articles', methods: ['find', 'get'] },
      ],
    },
  },
}
```

## `transports`

```ts
feathers: {
  transports: {
    rest: {
      path: '/feathers',
      framework: 'express', // 'express' | 'koa'
    },
    websocket: {
      path: '/socket.io',
      connectTimeout: 45_000,
      transports: ['websocket'],
      cors: {
        origin: 'https://app.example.test',
        credentials: true,
        methods: ['GET', 'POST'],
      },
    },
  },
}
```

REST reste disponible par défaut sauf désactivation explicite. Le timeout Socket.IO par défaut est de 45 000 ms.

## `server`

```ts
feathers: {
  server: {
    enabled: true,
    moduleDirs: ['server/feathers/modules'],
    modules: [],
    loadOrder: [
      'modules:pre',
      'plugins',
      'services',
      'modules:post',
    ],
    secureDefaults: true,
    secure: {
      cors: true,
      compression: true,
      helmet: true,
      bodyParser: {
        json: true,
        urlencoded: true,
      },
      serveStatic: false,
    },
  },
}
```

## `database`

La configuration recommandée utilise un registre de connexions nommées :

```ts
feathers: {
  database: {
    default: 'primary',
    connections: {
      primary: {
        type: 'mongodb',
        url: process.env.MONGODB_URL,
        database: 'application',
        management: {
          enabled: true,
          basePath: '/mongo/primary',
          auth: {
            enabled: true,
            authenticate: true,
          },
        },
      },
      reporting: {
        type: 'postgresql',
        connection: process.env.REPORTING_DATABASE_URL,
        pool: { min: 1, max: 10 },
      },
      localCache: {
        type: 'sqlite',
        connection: { filename: './data/cache.sqlite' },
        useNullAsDefault: true,
        required: false,
      },
    },
  },
}
```

Types pris en charge : `mongodb`, `postgresql`, `mysql`, `mariadb`, `sqlite` et `mssql`.

À partir de 6.7.41, chaque connexion résolue expose aussi des métadonnées non sensibles : `provider`, `databaseFamily`, `adapter`, `certification` et `capabilities`. Le mapping standard est fail-closed : MongoDB utilise le provider `mongodb`, tandis que PostgreSQL/MySQL/MariaDB/SQLite/MSSQL utilisent le provider `knex`. MongoDB, PostgreSQL, MySQL, MariaDB, SQLite et MSSQL sont certifiés. La gate MSSQL 6.7.48 utilise `tedious` sur SQL Server 2025, vérifie une vraie base et un vrai schéma isolés, l’auth UUID/JWT, un index natif, le rollback DML et le teardown de la base avant d’enregistrer le stamp. Pour les connexions MSSQL objets, NFZ ajoute `options.lowerCaseGuids: true` quand cette option n’est pas fournie afin de stabiliser la représentation des UUID.

Options communes à chaque connexion :

| Option | Défaut | Rôle |
|---|---:|---|
| `enabled` | `true` | active la connexion |
| `required` | `true` | bloque le démarrage en cas d’échec |
| `healthCheck` | `true` | vérifie la connexion après ouverture |
| `label` | — | libellé non sensible pour les diagnostics |

Pour MongoDB, `url`, `database` et `management` restent disponibles. Pour SQL, utilisez `connection`, `client`, `pool`, `acquireConnectionTimeout`, `useNullAsDefault` et `searchPath`.

La forme historique reste compatible :

```ts
feathers: {
  database: {
    mongo: {
      url: process.env.MONGODB_URL,
    },
  },
}
```

Elle devient une connexion nommée `default`. Ne combinez pas `database.mongo` et `database.connections.default`. Les opérations d’administration MongoDB destructrices restent désactivées par défaut. Voir [Registre multi-base](/guide/multi-database).

## `cache` — fondation native 6.8.0

Patch073 r1 introduit un cache NFZ **serveur uniquement**, désactivé par défaut. Le seul provider natif de cette première révision est `memory` ; Redis n'est pas encore un provider NFZ.

```ts
export default defineNuxtConfig({
  feathers: {
    cache: {
      enabled: true,
      provider: 'memory',
      namespace: 'nfz',
      defaultTtlMs: 60_000,
      maxEntries: 1_000,
      failOpen: true,
    },
  },
})
```

| Option | Défaut | Rôle |
|---|---:|---|
| `enabled` | `true` lorsque l'objet est fourni | active le cache natif |
| `provider` | `memory` | seul provider disponible en r1 |
| `namespace` | `nfz` | préfixe logique privé appliqué aux clés |
| `defaultTtlMs` | `60000` | TTL par défaut ; `0` = pas d'expiration |
| `maxEntries` | `1000` | borne du store mémoire, de 1 à 100000 |
| `failOpen` | `true` | une panne du cache devient un miss/échec d'écriture plutôt qu'une panne métier |

L'API serveur est exposée par `nuxt-feathers-zod/server-cache` :

```ts
import { getNfzCache } from 'nuxt-feathers-zod/server-cache'

const cache = getNfzCache(app)
const value = await cache?.getOrSet('dashboard:summary:v1', async () => {
  return await buildDashboardSummary()
}, { ttlMs: 30_000 })
```

`getOrSet` déduplique les producteurs concurrents pour une même clé. Les diagnostics ne contiennent ni clés ni valeurs. `undefined` n'est pas une valeur cachable. Le store mémoire est local au processus : il ne synchronise pas plusieurs instances/replicas.

### Redis en Patch073 r1

Pour Redis, utilisez encore Nitro/Unstorage au niveau applicatif et gardez les secrets dans `runtimeConfig` privé. N'utilisez pas `provider: 'redis'` : le resolver 6.8.0 r1 le rejette explicitement jusqu'à la révision Redis native.

Voir [Redis cache avec NFZ](/guide/redis-cache) pour le montage actuel, le TTL, l'invalidation et l'exemple DaisyUiKit complet.

## `auth`

```ts
feathers: {
  auth: {
    service: 'users',
    entity: 'user',
    entityClass: 'User',
    authStrategies: ['local', 'jwt'],
    local: {
      usernameField: 'email',
      passwordField: 'password',
      entityUsernameField: 'email',
      entityPasswordField: 'password',
    },
    client: {
      path: 'authentication',
      jwtStrategy: 'jwt',
      storageKey: 'feathers-jwt',
    },
  },
}
```

Pour changer le champ de connexion locale, configurez `auth.local.usernameField`. La CLI ne possède pas de flag `--localUsernameField`.

## `keycloak`

Les options structurantes sont :

- `serverUrl` ;
- `realm` ;
- `clientId` ;
- `onLoad` ;
- `mode` (`client-only` ou `bridge`) ;
- `secret` ;
- `issuer` ;
- `audience` ;
- `userService` ;
- `serviceIdField` ;
- `authServicePath` ;
- `permissions` ;
- `userProvisioning` ;
- `failOpen`.

Les secrets restent dans la configuration serveur privée. Le comportement recommandé est fail-closed.

## `validator`

```ts
feathers: {
  validator: {
    formats: ['date-time', 'email', 'hostname', 'ipv4', 'ipv6', 'uri'],
    extendDefaults: true,
  },
}
```

## `templates`

```ts
feathers: {
  templates: {
    dirs: ['feathers/templates'],
    strict: true,
    allow: ['server/*.ts', 'server/*.mjs', 'client/*.ts', 'types/*.d.ts'],
  },
}
```

Le mode strict et l’allow-list évitent qu’un template arbitraire écrive hors du périmètre attendu.

## `console`

```ts
feathers: {
  console: {
    enabled: true,
    basePath: '/console',
    allowWrite: false,
    servicesDirs: ['services'],
    legacyNitroRoutes: false,
  },
}
```

`console.enabled` active les services Feathers `nfz/*`. Le module n’injecte pas une page Vue de console dans l’application consommatrice. Le `basePath` reste une métadonnée publique de configuration pour les outils qui souhaitent monter leur propre UI.

`legacyNitroRoutes` conserve les façades `/api/nfz/**` pour compatibilité 6.x. Pour un nouveau projet, utilisez `false`.

## RuntimeConfig

Le module sépare :

- `runtimeConfig._feathers` : configuration serveur privée ;
- `runtimeConfig.public._feathers` : configuration exposée au client.

Ne dupliquez jamais une URL MongoDB avec identifiants ou un secret Keycloak dans `runtimeConfig.public`.

<!-- release-version: 6.8.0 -->
