
## 6.4.132 patch

NFZ now uses `app.get('mongoPath')` as the single source of truth for the embedded Mongo admin base path. The `mongodb.ts` template no longer re-reads `management.basePath` when mounting services; it seeds `app.get('mongoPath')` once when missing, then aligns every generated route with that runtime value.

## 6.4.131 patch

When `management.auth.enabled = true` and `management.auth.authenticate = false`, NFZ now keeps Mongo admin security metadata and lets `requireMongoAdmin()` apply the corresponding policy without forcing a prior authentication step. Mongo database name inference also strips a trailing slash.
---
editLink: false
---
# MongoDB management

`nuxt-feathers-zod` can expose an **optional** MongoDB management layer from the embedded `feathers/server/mongodb.ts` template.

This capability belongs to the **OSS core**, but it remains:

- disabled by default,
- explicitly opt-in,
- separate from your application business services.

## Options

```ts
export default defineNuxtConfig({
  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: true,
          auth: true,
          basePath: '/mongo',
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeUsersService: false,
          exposeCollectionCrud: true,
          showSystemDatabases: true,
          allowCreateCollection: true,
          allowDropCollection: true,
          allowInsertDocuments: true,
          allowPatchDocuments: true,
        },
      },
    },
  },
})
```

## Available options

- `enabled`: enables the management layer
- `auth`: protects that surface or not
- `basePath`: REST prefix, default `/mongo` (normalized automatically: trim, leading slash, trailing slash removed)
- `exposeDatabasesService`: exposes the database list
- `exposeCollectionsService`: exposes the collection list
- `exposeUsersService`: exposes MongoDB users management
- `exposeCollectionCrud`
- `whitelistDatabases` / `blacklistDatabases`
- `whitelistCollections` / `blacklistCollections`
- `allowCreateDatabase` / `allowDropDatabase`
- `showSystemDatabases`: also shows `admin`, `config`, `local` when enabled
- `allowCreateCollection` / `allowDropCollection`
- `allowInsertDocuments` / `allowPatchDocuments` / `allowReplaceDocuments` / `allowRemoveDocuments`: exposes CRUD operations on collections

## Canonical endpoints

- `GET /mongo/databases` → lists databases
- `GET /mongo/<db>/collections` → lists collections
- `POST /mongo/<db>/collections` → creates a collection when `allowCreateCollection: true`
- `DELETE /mongo/<db>/collections/<name>` → drops a collection when `allowDropCollection: true`

## Recommended positioning

Use it for:

- local or internal administration,
- technical diagnostics,
- bootstrap and maintenance.

Do not confuse it with:

- your application business model,
- end-user functional services.

## Practical local bootstrap

To quickly run a local MongoDB compatible with your tests:

```bash
bunx nuxt-feathers-zod add mongodb-compose
```

## CLI helper

You can patch `nuxt.config.*` directly from the CLI:

```bash
bunx nuxt-feathers-zod mongo management \
  --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin \
  --auth false \
  --basePath /mongo
```

This command updates `feathers.database.mongo.management` and can also set the MongoDB URL when missing.

## Runtime contract

The generated embedded Mongo runtime exposes three values on the Feathers app:

- `app.get('mongodbClient')` → `Promise<Db>` used by generated MongoDB services
- `app.get('mongodbDb')` → current `Db`
- `app.get('mongodbConnection')` → raw `MongoClient`
- `app.get('mongoPath')` → single runtime source of truth for the Mongo admin base path (seeded once from `management.basePath` when missing)

## Audit and auth alignment

When `feathers.database.mongo.management.auth.userProperty` is customized, the generated `feathers/server/mongodb.ts` audit logger resolves the same property before deriving the audit user identifier. This keeps audit output aligned with `requireMongoAdmin(...)`.


### Mongo admin authentication bridge

Mongo management routes now use the standard Feathers `authenticate(...)` hook before `requireMongoAdmin(...)`. This keeps Mongo admin aligned with the authentication pipeline used by regular protected Feathers services while preserving the dedicated Mongo admin authorization layer. Mongo management auth also exposes `authStrategies` (default `['jwt']`).
