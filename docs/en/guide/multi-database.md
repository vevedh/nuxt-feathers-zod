# Multi-database registry

Since version 6.7.0, NFZ can initialize several named connections and let every Feathers service select its connection. Starting with 6.7.41, every engine is also described by a **provider**, a **database family** (`databaseFamily`), a **certification** level, and non-sensitive **capabilities**. MongoDB and PostgreSQL are certified by real-engine gates; MySQL, MariaDB, and SQLite have implemented Knex paths that remain uncertified until their dedicated patches.

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

Private `url` and `connection` values stay in `runtimeConfig._feathers`. Public runtime configuration only exposes the name, type, provider, `databaseFamily`, certification level, capabilities, default state, and non-sensitive diagnostic options.


## Provider and capabilities

NFZ now separates the database **engine** (`type`) from its runtime **provider**. This prevents engine-specific branching from spreading through the runtime and prepares future engines without implicit fallbacks.

| Type | Provider | Database family | Knex client | Driver package | NFZ pool default | NFZ certification |
| --- | --- | --- | --- | --- | --- | --- |
| `mongodb` | `mongodb` | document | — | native MongoDB driver | — | certified |
| `postgresql` | `knex` | SQL | `pg` | `pg` | `min: 0, max: 10` | certified |
| `mysql` | `knex` | SQL | `mysql2` | `mysql2` | `min: 0, max: 10` | implemented path |
| `mariadb` | `knex` | SQL | `mysql2` | `mysql2` | `min: 0, max: 10` | implemented path |
| `sqlite` | `knex` | SQL | `better-sqlite3` | `better-sqlite3` | `min: 0, max: 1` | implemented path |

`databaseFamily` is deliberately distinct from MongoDB's native numeric `family` option used for IPv4/IPv6 selection; the native driver option remains available.

`nfz/database-connections` diagnostics expose only these metadata and capabilities, never connection secrets. Starting with 6.7.42, SQL connections advertise `transactions: true` because NFZ now provides a transaction helper scoped to **one named SQL connection**. `indexManagement` and `migrations` remain `false` until their dedicated patches land.

The client/driver mapping is **exhaustive and fail-closed**: a new `type` must have an explicit descriptor before it can resolve. When a real SQL connection starts, NFZ checks that the declared driver package is installed before creating the Knex client. An advanced Knex `client` override is still allowed, but it must explicitly declare `driverPackage`; NFZ does not guess the matching driver. Public diagnostics expose `defaultClient`, `driverPackage`, and the `customClient` boolean, never a connection string.

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

The SQL provider loads Knex and the driver lazily. A missing driver package fails with an explicit NFZ startup error before the connection is opened.


## PostgreSQL certification

Starting with 6.7.45, PostgreSQL is an **NFZ-certified** engine. The release gate runs the exact candidate npm tarball against a real isolated PostgreSQL instance. It covers:

- connection and health check through `pg`/Knex;
- isolated schema creation and teardown;
- real PostgreSQL table and index creation;
- Feathers CRUD with an integer identifier;
- numeric filtering, `$in`, pagination, and `$sort` parsed from HTTP-like query strings;
- a verified transaction rollback;
- local authentication followed by JWT entity re-read for a UUID user ID;
- registry close and schema teardown.

The gate uses Docker by default (`postgres:18-alpine`) and can target an explicitly dedicated external database:

```powershell
$env:NFZ_POSTGRESQL_CERTIFICATION_URL = 'postgresql://nfz:secret@127.0.0.1:5432/nfz_cert'
bun run release:candidate
bun run test:postgresql:release
```

Without `NFZ_POSTGRESQL_CERTIFICATION_URL`, Docker must be available. The gate always creates and removes a dedicated `nfz_cert_*` schema, but only a database intended for certification should be used. This evidence does not turn `indexManagement` or `migrations` into generic NFZ capabilities; those remain `false` until a provider-neutral API exists.

### Migrating from 6.7.44 and earlier

The 6.7.45 certification does not change `feathers.database.connections` or generated Knex service shapes. To migrate an existing PostgreSQL project:

1. upgrade NFZ to 6.7.45;
2. keep `type: 'postgresql'` and the existing named connection;
3. ensure `@feathersjs/knex`, `knex`, and `pg` are installed by the application;
4. run your normal application migrations before NFZ startup;
5. use `nuxt-feathers-zod doctor` and `nfz/database-connections` to confirm `certification: 'certified'` and a healthy connection.

NFZ does not automatically run SQL migrations or mutate application schemas during the upgrade.

## Safe SQL pooling

NFZ normalizes the Knex pool before creating the client:

- PostgreSQL, MySQL, and MariaDB default to `min: 0`, `max: 10`;
- SQLite defaults to `min: 0`, `max: 1`, and `pool.max=1` is enforced to preserve single-file/in-memory database semantics;
- `acquireConnectionTimeout` defaults to `60000` ms and must be a positive integer;
- pool bounds and timeout values are validated before startup;
- `pool.min > pool.max` is rejected instead of silently corrected.

```ts
reporting: {
  type: 'postgresql',
  connection: process.env.REPORTING_DATABASE_URL!,
  pool: {
    min: 0,
    max: 7,
    idleTimeoutMillis: 30_000,
  },
  acquireConnectionTimeout: 10_000,
}
```

## Generate a service for a named connection

MongoDB:

```bash
bunx nuxt-feathers-zod@6.7.45 add service messages \
  --database mongodb \
  --connection primary \
  --collection messages \
  --schema zod
```

PostgreSQL with an explicit table and SQL schema:

```bash
bunx nuxt-feathers-zod@6.7.45 add service audit-events \
  --database postgresql \
  --connection reporting \
  --table audit_events \
  --schemaName reporting \
  --schema zod \
  --auth
```

The generated MongoDB service uses `getNfzMongoDatabase(app, 'primary')`. The Knex service uses `getNfzKnexClient(app, 'reporting')`. Services do not create independent connections.

Starting with 6.7.43, generated manifests also record portable binding identity (`databaseType`, `databaseProvider`, `databaseFamily`). The legacy-compatible `--adapter mongodb|knex` syntax remains accepted, but `--database` keeps adapter selection out of the business-facing CLI. `doctor` reports a mismatch when, for example, a service generated for `postgresql` references a named connection configured as `mysql`.


### Portable identifiers

Starting with 6.7.44, a service binding can also record `idStrategy`. This property describes the service identifier contract independently from `databaseType`: MongoDB keeps `objectid` as its default, Knex and Memory use `integer` by default, and compatible alternatives are validated fail-closed.

`uuid` and `string` are client-assigned identifiers in generated create templates. `bigint` is available only on the Knex path and stays a decimal string at the API/Zod boundary so it remains JSON-serializable. PostgreSQL now has real CRUD/auth/query/lifecycle evidence with UUID and integer IDs. Native bigint guarantees remain intentionally outside this certification; MySQL/MariaDB and SQLite will receive real-engine evidence in their dedicated patches.

`doctor` surfaces `idStrategy` from the service manifest and rejects a strategy that is provably incompatible with the generated adapter.

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
  withNfzSqlTransaction,
} from 'nuxt-feathers-zod/server-database'
```

Use these helpers from Feathers services and server modules instead of reading registry internals.

### Transaction on one SQL connection

`withNfzSqlTransaction()` delegates to the Knex client already owned by the registry. It rejects MongoDB connections and never coordinates multiple databases:

```ts
import type { Knex } from 'knex'
import { withNfzSqlTransaction } from 'nuxt-feathers-zod/server-database'

await withNfzSqlTransaction<void, Knex.Transaction>(app, async (trx) => {
  await trx('audit_events').insert({ action: 'login' })
}, { connection: 'reporting' })
```

An exception from the callback is propagated to Knex so that connection's transaction is rolled back. NFZ does not simulate cross-connection or MongoDB + SQL atomic transactions.

## 6.7.x train limits

- NFZ initializes connections and adapters but does not create SQL tables or Knex migrations.
- Transactions spanning multiple connections are not atomic.
- MikroORM and relational entities are reserved for a later release.
- SQL drivers remain optional dependencies of the consumer application.

<!-- release-version: 6.7.45 -->
