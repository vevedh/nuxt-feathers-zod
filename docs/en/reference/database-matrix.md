---
editLink: false
---
# Database certification matrix

NFZ exposes one canonical matrix for built-in database engines. It is derived from the same runtime descriptors used by the named-connection registry and guarded by the release pipeline so public status cannot silently drift from shipped behavior.

## 6.7.49 matrix

| Type | Provider | Family | Runtime client | Driver | Transactions | Schema namespaces | Certification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mongodb` | `mongodb` | document | — | native MongoDB | not generic | no | **certified** |
| `postgresql` | `knex` | SQL | `pg` | `pg` | yes | yes | **certified** |
| `mysql` | `knex` | SQL | `mysql2` | `mysql2` | yes | no | **certified** |
| `mariadb` | `knex` | SQL | `mysql2` | `mysql2` | yes | no | **certified** |
| `sqlite` | `knex` | SQL | `better-sqlite3` | `better-sqlite3` | yes | no | **certified** |
| `mssql` | `knex` | SQL | `mssql` | `tedious` | yes | yes | **certified** |

`certified` means that NFZ maintains regression evidence for the corresponding runtime path. SQL release promotion is stricter: PostgreSQL, MySQL, MariaDB, SQLite, and MSSQL must all validate the **same exact candidate tarball** before it can be promoted.

MongoDB keeps its historical certified coverage through the embedded runtime, MongoDB tests, starter, and production gates. The SQL certification train from 6.7.45 through 6.7.48 adds exact-engine, candidate-bound evidence for every relational dialect.

## Immutable SQL chain

The final manifest must preserve exactly this validation chain on one candidate SHA:

```text
postgresql,mysql,mariadb,sqlite,mssql,database-matrix,starter,consumer
```

The authoritative release order is:

```text
release:candidate
  -> PostgreSQL
  -> MySQL + MariaDB
  -> SQLite
  -> MSSQL
  -> database-matrix
  -> exact starter
  -> clean npm consumer
  -> release:finalize
```

`release:finalize` and `publish:npm` reject an artifact when a validation is missing or references a different SHA.

The `database-matrix` gate preflights its Docker images before starting containers: `mongo:7.0` and `postgres:18-alpine` by default. When an image is not local, it is pulled explicitly with a bounded timeout before `docker run`; maintainers can override these pins with `NFZ_MATRIX_MONGODB_DOCKER_IMAGE` and `NFZ_MATRIX_POSTGRESQL_DOCKER_IMAGE`.

## Public capabilities

Capabilities describe what NFZ abstracts portably, not everything each database can do natively. Certification therefore creates real indexes and uses real transactions to prove engine behavior without claiming a generic NFZ API that does not exist.

The explicit limits remain:

- `indexManagement: false`
- `migrations: false`
- no distributed transaction contract across named connections;
- no portability guarantee for engine-specific operators.

`schemaNamespaces` is `true` only for PostgreSQL and MSSQL. SQLite keeps an NFZ pool bounded to one connection to preserve file semantics.

## CLI inspection

Inspect the runtime matrix without opening a database connection:

```bash
bunx nuxt-feathers-zod capabilities --section databases --json
```

Doctor also reports the integrated/certified engine counts:

```text
database.supportedEngines: mongodb, postgresql, mysql, mariadb, sqlite, mssql
database.certifiedEngines: 6/6
```

For configured connection state, use `nuxt-feathers-zod doctor` or the `nfz/database-connections` Feathers service. Diagnostics remain redacted.

<!-- release-version: 6.8.0 -->
