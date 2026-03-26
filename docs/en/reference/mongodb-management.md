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
