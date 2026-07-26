# Multi-database registry

Since version 6.7.0, NFZ can initialize several named connections and let every Feathers service select its connection. The registry supports MongoDB and the SQL databases handled by Knex: PostgreSQL, MySQL, MariaDB, and SQLite.

## Recommended configuration

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    database: {
      default: 'primary',
      connections: {
        primary: {
          type: 'mongodb',
          url: process.env.MONGODB_URL!,
          database: 'application',
          management: { enabled: false },
        },
        reporting: {
          type: 'postgresql',
          connection: process.env.REPORTING_DATABASE_URL!,
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
  },
})
```

Private `url` and `connection` values stay in `runtimeConfig._feathers`. Public runtime configuration only exposes the name, type, default state, and non-sensitive diagnostic options.

## SQL dependencies

SQL support is optional. Install Knex, the Feathers adapter, and the matching driver:

```bash
bun add @feathersjs/knex knex
bun add pg
```

For MySQL or MariaDB:

```bash
bun add @feathersjs/knex knex mysql2
```

For SQLite:

```bash
bun add @feathersjs/knex knex better-sqlite3
```

## Generate a service for a named connection

MongoDB:

```bash
bunx nuxt-feathers-zod@6.7.37 add service messages \
  --adapter mongodb \
  --connection primary \
  --collection messages \
  --schema zod
```

PostgreSQL with an explicit table and SQL schema:

```bash
bunx nuxt-feathers-zod@6.7.37 add service audit-events \
  --adapter knex \
  --connection reporting \
  --table audit_events \
  --schemaName reporting \
  --schema zod \
  --auth
```

The generated MongoDB service uses `getNfzMongoDatabase(app, 'primary')`. The Knex service uses `getNfzKnexClient(app, 'reporting')`. Services do not create independent connections.

## Default connection

When `--connection` is omitted, the service uses `database.default`. If no explicit default exists, NFZ selects the first enabled connection. Production configurations should always set `database.default` explicitly.

## `database.mongo` compatibility

The legacy configuration remains valid:

```ts
feathers: {
  database: {
    mongo: {
      url: process.env.MONGODB_URL!,
    },
  },
}
```

NFZ maps it to a named `default` connection and preserves `mongodbClient`, `mongodbDb`, `mongodbConnection`, `currentDatabase`, and `mongodb_ok`. Declaring both `database.mongo` and `database.connections.default` is rejected as ambiguous.

## Lifecycle and failure policy

| Option | Default | Effect |
|---|---:|---|
| `enabled` | `true` | includes the connection in the registry |
| `required` | `true` | blocks startup when connection fails |
| `healthCheck` | `true` | runs a ping or `select 1` after connection |
| `label` | — | adds a non-sensitive diagnostic label |

Connections close in reverse order during Nitro shutdown. A failed optional connection remains visible in diagnostics without blocking the application.



### Persistent service registration

Persistent services are **fail-closed by default**. If a required MongoDB or Knex service references unavailable infrastructure, the runtime never reaches `ready` and already-opened resources are closed.

A project with deliberately optional services may enable the compatibility escape hatch:

```ts
feathers: {
  server: {
    allowMissingDatabaseServices: true,
  },
}
```

Do not use this option to hide a required production database. Skipped services are stored in `app.get('nfzSkippedRegistrars')` and exposed without secrets through `nfz/status`. A registrar explicitly marked `required: true` remains blocking even when compatibility mode is enabled.


## Feathers diagnostics

When the NFZ console is enabled:

```ts
const service = useService('nfz/database-connections')
const status = await service.find()
const reporting = await service.get('reporting')
```

`find()` returns cached state. `get(name)` runs a fresh health check. URLs, passwords, and connection objects are never returned.

## Server helpers

```ts
import {
  checkNfzDatabaseConnection,
  getNfzDatabaseConnection,
  getNfzDatabaseDiagnostics,
  getNfzDatabaseRegistry,
  getNfzKnexClient,
  getNfzMongoDatabase,
} from 'nuxt-feathers-zod/server-database'
```

Use these helpers from Feathers services and server modules instead of reading registry internals.

## 6.7.0 limits

- NFZ initializes connections and adapters but does not create SQL tables or Knex migrations.
- Transactions spanning multiple connections are not atomic.
- MikroORM and relational entities are reserved for a later release.
- SQL drivers remain optional dependencies of the consumer application.

<!-- release-version: 6.7.37 -->
