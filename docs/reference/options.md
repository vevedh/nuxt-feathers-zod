# Options

API publique `feathers` dans `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: { path: '/socket.io' }
    },
    servicesDirs: ['services'],
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: false,
          auth: true,
          basePath: '/mongo'
        }
      }
    },
    server: {
      enabled: true,
      pluginDirs: ['server/feathers'],
      moduleDirs: ['server/feathers/modules'],
      secureDefaults: true
    },
    auth: false,
    swagger: false,
    templates: { enabled: false, dirs: [] }
  }
})
```

## Blocs principaux

### `client`

- `mode`: `embedded | remote`
- `remote`: config du backend distant
- `pinia`: intégration feathers-pinia

### `transports`

- `rest.path`
- `rest.framework`: `express | koa`
- `websocket.path`

### `servicesDirs`

Dossiers scannés pour les services embedded.

Convention recommandée :

```ts
servicesDirs: ['services']
```

### `database`

#### `database.mongo`

- `url`
- options Mongo sérialisables compatibles `MongoClient`
- `management`

#### `database.mongo.management`

- `enabled`
- `auth`
- `basePath`
- `exposeDatabasesService`
- `exposeCollectionsService`
- `exposeUsersService`
- `exposeCollectionCrud`
- `whitelistDatabases` / `blacklistDatabases`
- `showSystemDatabases`
- `whitelistCollections` / `blacklistCollections`
- `allowCreateDatabase` / `allowDropDatabase`
- `allowCreateCollection` / `allowDropCollection`
- `allowInsertDocuments` / `allowPatchDocuments` / `allowReplaceDocuments` / `allowRemoveDocuments`

Cette couche est **optionnelle** et destinée à exposer une surface de gestion MongoDB via le template embedded `feathers/server/mongodb.ts`.

### `server`

- `enabled`
- `pluginDirs`
- `plugins`
- `moduleDirs`
- `modules`
- `secureDefaults`
- `secure`

### `auth`

- `false`
- `true`

En embedded, `auth: true` implique généralement un service `users` local généré via la CLI.

### `swagger`

- `false`
- `true`

### `templates`

- `enabled`
- `dirs`
- `strict`
- `allow`

## Exemple remote

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '/api/v1',
        websocketPath: '/socket.io',
        services: [{ path: 'users', methods: ['find', 'get'] }],
        auth: {
          enabled: true,
          payloadMode: 'jwt',
          strategy: 'jwt',
          tokenField: 'accessToken',
          servicePath: 'authentication',
          reauth: true
        }
      }
    }
  }
})
```
