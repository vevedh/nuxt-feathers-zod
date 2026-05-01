# Référence des options

Cette page synthétise les options principales du bloc `feathers` dans `nuxt.config.ts`.

## Exemple complet

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  feathers: {
    servicesDirs: ['services'],

    client: {
      mode: 'embedded',
      pinia: true,
    },

    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        connectTimeout: 45000,
      },
    },

    server: {
      enabled: true,
      framework: 'express',
      secureDefaults: true,
      modules: [],
    },

    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: false,
          basePath: '/mongo',
        },
      },
    },

    auth: false,
    keycloak: false,
    swagger: false,
    devtools: true,
    console: false,
  },
})
```

## Options racine

| Option | Type | Défaut | Description |
|---|---:|---:|---|
| `servicesDirs` | `string \| string[]` | `['services']` | Dossiers scannés pour les services embedded |
| `transports` | `object` | `{ websocket: true }` | REST et Socket.IO |
| `server` | `object \| boolean` | `serverDefaults` | Runtime serveur embedded |
| `client` | `object \| boolean` | `true` | Client Nuxt |
| `auth` | `object \| boolean` | `true` | Authentification Feathers |
| `keycloak` | `object \| boolean` | `false` | SSO Keycloak côté client |
| `database` | `object` | `{}` | Infrastructure base de données |
| `validator` | `object` | `{ formats: [], extendDefaults: true }` | Validateurs Zod/AJV |
| `swagger` | `object \| boolean` | `false` | Swagger legacy |
| `templates` | `object` | `{}` | Overrides de templates |
| `devtools` | `boolean` | `true` | DevTools NFZ en développement |
| `console` | `object \| boolean` | `false` | Console/builder NFZ |

## `client`

```ts
client: {
  mode: 'embedded',
  pinia: true,
}
```

| Option | Type | Description |
|---|---|---|
| `mode` | `'embedded' \| 'remote'` | Mode d’exécution client |
| `pinia` | `boolean \| object` | Active les stores runtime NFZ |
| `remote.url` | `string` | URL de l’API Feathers distante |
| `remote.transport` | `'auto' \| 'rest' \| 'socketio'` | Transport remote |
| `remote.restPath` | `string` | Chemin REST distant |
| `remote.websocketPath` | `string` | Chemin Socket.IO distant |
| `remote.services` | `Array<{ path, methods? }>` | Services distants déclarés |
| `remote.auth` | `object` | Authentification remote |

## `remote.auth`

```ts
client: {
  mode: 'remote',
  remote: {
    url: 'https://api.example.com',
    auth: {
      enabled: true,
      payloadMode: 'keycloak',
      strategy: 'jwt',
      tokenField: 'access_token',
      servicePath: 'authentication',
      reauth: true,
      storageKey: 'feathers-jwt',
    },
  },
}
```

| Option | Description |
|---|---|
| `enabled` | Active l’auth remote |
| `payloadMode` | `jwt` ou `keycloak` |
| `strategy` | Stratégie Feathers envoyée |
| `tokenField` | Champ du token dans le payload |
| `servicePath` | Service d’authentification |
| `reauth` | Réauthentification automatique |
| `storageKey` | Clé de stockage du token |

## `transports`

```ts
transports: {
  rest: {
    path: '/feathers',
    framework: 'express',
  },
  websocket: {
    path: '/socket.io',
  },
}
```

| Option | Description |
|---|---|
| `rest` | Configuration REST ou `false` |
| `rest.path` | Préfixe REST |
| `rest.framework` | `express` ou `koa` |
| `websocket` | Configuration Socket.IO ou `false` |
| `websocket.path` | Chemin Socket.IO |
| `websocket.transports` | Transports Socket.IO |
| `websocket.connectTimeout` | Timeout de connexion |
| `websocket.cors` | CORS Socket.IO |

## `server`

```ts
server: {
  enabled: true,
  framework: 'express',
  secureDefaults: true,
}
```

| Option | Description |
|---|---|
| `enabled` | Active le runtime serveur embedded |
| `framework` | `express` ou `koa` |
| `secureDefaults` | Active un preset sécurisé |
| `modules` | Modules serveur personnalisés |
| `modulesDir` | Dossier des modules serveur |
| `serveStatic` | Sert des fichiers statiques |
| `serveStaticPath` | Chemin public |
| `serveStaticDir` | Dossier local |

## `auth`

```ts
auth: {
  service: 'users',
  entity: 'user',
  entityClass: 'User',
  authStrategies: ['local', 'jwt'],
  local: {
    usernameField: 'email',
    passwordField: 'password',
  },
}
```

| Option | Description |
|---|---|
| `service` | Service utilisateur |
| `entity` | Nom de l’entité |
| `entityClass` | Classe/type d’entité |
| `authStrategies` | `local`, `jwt`, `oauth` |
| `jwtOptions` | Options JWT Feathers |
| `local` | Options local auth |
| `client.storageKey` | Clé de stockage côté client |

## `database.mongo`

```ts
database: {
  mongo: {
    url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
    management: {
      enabled: true,
      basePath: '/mongo',
      auth: true,
    },
  },
}
```

| Option | Description |
|---|---|
| `url` | URL MongoDB |
| `management.enabled` | Active les routes management |
| `management.basePath` | Base path management |
| `management.auth` | Protection des routes |
| `management.exposeDatabasesService` | Expose les bases |
| `management.exposeCollectionsService` | Expose les collections |
| `management.exposeCollectionCrud` | Expose documents/aggregate |
| `management.whitelistDatabases` | Allowlist bases |
| `management.blacklistDatabases` | Blocklist bases |
| `management.whitelistCollections` | Allowlist collections |
| `management.blacklistCollections` | Blocklist collections |
| `management.allowCreateDatabase` | Création de base |
| `management.allowDropDatabase` | Suppression de base |
| `management.allowCreateCollection` | Création de collection |
| `management.allowDropCollection` | Suppression de collection |
| `management.allowInsertDocuments` | Insert documents |
| `management.allowPatchDocuments` | Patch documents |
| `management.allowReplaceDocuments` | Replace documents |
| `management.allowRemoveDocuments` | Delete documents |

## `keycloak`

```ts
keycloak: {
  serverUrl: 'https://sso.example.com',
  realm: 'myrealm',
  clientId: 'my-nuxt-app',
  onLoad: 'check-sso',
}
```

| Option | Description |
|---|---|
| `serverUrl` | URL Keycloak |
| `realm` | Realm |
| `clientId` | Client public |
| `authServicePath` | Service d’auth côté Feathers |
| `onLoad` | `check-sso` ou `login-required` |

## `templates`

```ts
templates: {
  dirs: ['feathers/templates'],
}
```

Les templates permettent de remplacer les fichiers générés dans `.nuxt/feathers`.

## Bonnes pratiques

- Garde les options explicites dans les projets de production.
- Active `auth: false` pendant les premiers tests si aucun service `users` n’existe.
- Active `database.mongo.management.auth` dès que les routes Mongo sont exposées.
- En remote, configure `server.enabled: false` pour éviter toute ambiguïté.
- Documente les overrides de templates dans ton README applicatif.
