# Feathers and Zod services

A service is the primary functional unit of `nuxt-feathers-zod`. The CLI generates the structure expected by service discovery and schema tooling.

## Standard service

```bash
bunx nuxt-feathers-zod add service articles --database mongodb --connection primary --collection articles --schema zod
```

Starting with 6.7.43, the recommended form is **database engine + named connection**: `--database` selects `mongodb`, `postgresql`, `mysql`, `mariadb`, or `sqlite`, and the CLI selects the compatible `mongodb` or `knex` adapter. `--connection` then binds the generated service to the NFZ registry.

The existing `--adapter mongodb|knex` syntax remains compatible, while `--adapter memory` stays available for in-memory services. If both selectors are present, NFZ rejects incompatible combinations.

For SQL, use `--table` and optionally `--schemaName`:

```bash
bunx nuxt-feathers-zod@6.8.0 add service audit-events \
  --database postgresql \
  --connection reporting \
  --table audit_events \
  --schemaName reporting \
  --schema zod
```

The `.nfz/services/<service>.json` manifest records `connectionName`, `databaseType`, `databaseProvider`, and `databaseFamily`. `schema <service> --show` surfaces that identity metadata, and `doctor` compares generated bindings with named connections from `nuxt.config.ts` when they can be resolved statically.

### Choose an identifier strategy

Starting with 6.7.44, `--idStrategy` makes the identifier contract explicit without silently deriving semantics from the database engine:

| Adapter | Default | Available strategies |
| --- | --- | --- |
| MongoDB | `objectid` | `objectid`, `uuid`, `string` |
| Knex / SQL | `integer` | `integer`, `bigint`, `uuid`, `string` |
| Memory | `integer` | `integer`, `uuid`, `string` |

PostgreSQL UUID example:

```bash
bunx nuxt-feathers-zod@6.8.0 add service api-keys \
  --database postgresql \
  --connection reporting \
  --table api_keys \
  --schema zod \
  --idStrategy uuid
```

The manifest then records `idStrategy: "uuid"`, and the generated class passes `id: "id"` explicitly to the Feathers adapter. `uuid` and `string` are treated as client-assigned identifiers in generated create schemas; `objectid`, `integer`, and `bigint` are omitted from create schemas by default so the adapter or database can generate them.

`bigint` is represented at the API boundary as a **decimal string** (`"9223372036854775807"`), not as JavaScript `bigint`. This avoids JSON serialization loss or failures; actual SQL-driver behavior remains subject to the later per-engine certification patches.

Zod query handling preserves the distinction: query-string values are coerced to numbers only for number-backed fields, while UUID, string, and decimal-bigint identifiers remain strings. Textual `$sort` values `"1"` and `"-1"` are normalized to the Feathers sort orders `1` and `-1`.

Schema modes are `none`, `zod`, and `json`.

## Custom service

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find --customMethods run --schema zod
```

`find` is a standard Feathers method. `run` is an explicitly declared custom method.

## Schema fields

```bash
bunx nuxt-feathers-zod schema articles --show
bunx nuxt-feathers-zod schema articles --add-field title:string!
bunx nuxt-feathers-zod schema articles --set-field published:boolean=false
bunx nuxt-feathers-zod schema articles --validate
```

## Protected services

```bash
bunx nuxt-feathers-zod auth service articles --enabled
```

Keep authentication and authorization in Feathers hooks instead of duplicating business security in Nitro API routes.

## Client call

```ts
const articles = useService('articles')
const page = await articles.find({
  query: {
    published: true,
    $limit: 25,
    $sort: { createdAt: -1 },
  },
})
```

## Server call

```ts
const rows = await app.service('articles').find({
  query: { $limit: 25 },
  provider: undefined,
})
```

No loopback HTTP request is required inside the same server runtime.

<!-- release-version: 6.8.0 -->
