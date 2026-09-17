# Multi-database registry

Since version 6.7.0, NFZ can initialize several named connections and let every Feathers service select its connection. Starting with 6.7.41, every engine is also described by a **provider**, a **database family** (`databaseFamily`), a **certification** level, and non-sensitive **capabilities**. MongoDB, PostgreSQL, MySQL, MariaDB, SQLite, and MSSQL are certified by real-engine gates against the exact candidate artifact. MSSQL is certified against SQL Server 2025 with the `tedious` driver in an isolated database and schema.

The consolidated reference view is available in the [database certification matrix](/en/reference/database-matrix). It is derived from the same descriptors as the runtime and checked by the release gate.

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
| `mysql` | `knex` | SQL | `mysql2` | `mysql2` | `min: 0, max: 10` | certified |
| `mariadb` | `knex` | SQL | `mysql2` | `mysql2` | `min: 0, max: 10` | certified |
| `sqlite` | `knex` | SQL | `better-sqlite3` | `better-sqlite3` | `min: 0, max: 1` | certified |
| `mssql` | `knex` | SQL | `mssql` | `tedious` | `min: 0, max: 10` | certified |

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

For Microsoft SQL Server:

```bash
bun add @feathersjs/knex knex tedious
```

The SQL provider loads Knex and the driver lazily. A missing driver package fails with an explicit NFZ startup error before the connection is opened. For object-based MSSQL connections, NFZ defaults `connection.options.lowerCaseGuids` to `true` so UUIDs keep a canonical representation consistent with the other engines. An explicit override remains possible, but it changes the casing of `uniqueidentifier` values returned by `tedious`.


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

## MySQL and MariaDB certification

Starting with 6.7.46, **MySQL and MariaDB are certified separately** instead of being treated as equivalent just because both use `mysql2`. The release gate runs the same exact candidate tarball against two real engines: `mysql:8.4` and then `mariadb:11.8`.

For each engine, the evidence covers:

- connection and health check through `mysql2`/Knex;
- real engine identity verification through `VERSION()`;
- isolated table setup/teardown and index inspection through `information_schema.statistics`;
- Feathers CRUD with an integer ID;
- numeric filters, `$in`, pagination and `$sort` parsed from HTTP-like query values;
- a verified **DML** transaction rollback;
- local authentication followed by JWT entity re-read for a UUID stored as a 36-character string;
- registry close and isolated table teardown.

Default Docker-backed gate:

```powershell
bun run release:candidate
bun run test:mysql-mariadb:release
```

Dedicated external databases can be used explicitly:

```powershell
$env:NFZ_MYSQL_CERTIFICATION_URL = 'mysql://nfz:secret@127.0.0.1:3306/nfz_cert'
$env:NFZ_MARIADB_CERTIFICATION_URL = 'mysql://nfz:secret@127.0.0.1:3307/nfz_cert'
bun run release:candidate
bun run test:mysql-mariadb:release
```

Dialect limits stay explicit: MySQL and MariaDB do not expose PostgreSQL-style schema namespaces (`schemaNamespaces: false`) and their DDL can imply commits. Transaction certification therefore covers DML; it does not turn `migrations` or `indexManagement` into generic NFZ capabilities.

## SQLite certification

Starting with 6.7.47, SQLite is an **NFZ-certified** engine. The gate installs the exact candidate tarball into an isolated consumer, rebuilds only the native `better-sqlite3` binding, then operates on a real `.sqlite` file created in a temporary directory. It uses neither Docker nor `:memory:`.

The evidence covers:

- Knex connection/health check and `sqlite_version()` identity verification;
- Feathers CRUD with an integer identifier;
- Zod numeric coercion plus `$in`, `$sort`, `$limit`, `$skip`, and pagination;
- local authentication with a UUID user ID followed by JWT entity re-read;
- real SQLite index creation and inspection through `sqlite_master`;
- verified DML transaction rollback;
- complete first-registry close, reopening the **same file** through a new registry, and persistence verification;
- second-registry close followed by explicit database-file and temporary-directory deletion before the certification stamp is recorded.

```powershell
bun run release:candidate
bun run test:sqlite:release
```

The release evidence pins `better-sqlite3@12.11.1`, which is within the public `^11.0.0 || ^12.0.0` peer contract. Creating a native index inside the certification fixture does not provide a portable NFZ index-management or migration API, so `indexManagement: false` and `migrations: false` intentionally remain unchanged.

## MSSQL certification

Starting with 6.7.48, `mssql` is an **NFZ-certified** engine. The gate installs the exact candidate tarball into an isolated consumer and uses Knex with `client: 'mssql'` plus `tedious`. By default it starts a dedicated SQL Server 2025 instance from Microsoft container image `mcr.microsoft.com/mssql/server:2025-CU8-ubuntu-22.04`; an explicitly dedicated external connection can be supplied through `NFZ_MSSQL_CERTIFICATION_CONNECTION_JSON`.

The evidence verifies:

- SQL Server identity and major version `17` or newer;
- creation of an isolated database and `nfz_*` schema;
- Feathers CRUD with an integer `IDENTITY` ID;
- Zod numeric coercion, `$in`, `$sort`, `$limit`, `$skip`, and pagination;
- local authentication with a UUID entity ID followed by JWT entity re-read, with canonical lowercase output through `tedious` `lowerCaseGuids`;
- real index creation and inspection through `sys.indexes`/`sys.tables`/`sys.schemas`;
- verified DML rollback;
- registry shutdown and fail-closed isolated database deletion before the `mssql` stamp is recorded.

```powershell
bun run release:candidate
bun run test:mssql:release
```

The local certification container receives a random `sa` password through the Docker process environment rather than a command-line value. For an external target, keep the JSON connection in a private maintainer environment and use only a database dedicated to certification. Native index evidence does not turn `indexManagement` or `migrations` into generic NFZ APIs; both capabilities remain `false`.

## Safe SQL pooling

NFZ normalizes the Knex pool before creating the client:

- PostgreSQL, MySQL, MariaDB, and MSSQL default to `min: 0`, `max: 10`;
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
bunx nuxt-feathers-zod@6.7.51 add service messages \
  --database mongodb \
  --connection primary \
  --collection messages \
  --schema zod
```

PostgreSQL with an explicit table and SQL schema:

```bash
bunx nuxt-feathers-zod@6.7.51 add service audit-events \
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

`uuid` and `string` are client-assigned identifiers in generated create templates. `bigint` is available only on the Knex path and stays a decimal string at the API/Zod boundary so it remains JSON-serializable. PostgreSQL has real CRUD/auth/query/lifecycle evidence with UUID and integer IDs. Native bigint guarantees remain intentionally outside this certification; MySQL/MariaDB have dedicated real-engine evidence, SQLite has real file-backed evidence with close/reopen persistence, and MSSQL has SQL Server 2025 evidence with isolated database/schema teardown.

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

<!-- release-version: 6.7.51 -->
