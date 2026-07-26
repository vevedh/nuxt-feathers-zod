# Feathers and Zod services

A service is the primary functional unit of `nuxt-feathers-zod`. The CLI generates the structure expected by service discovery and schema tooling.

## Standard service

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --collection articles --schema zod
```

Supported generated adapters are `memory`, `mongodb`, and `knex` for PostgreSQL, MySQL, MariaDB, and SQLite. Persistent services can select a named connection with `--connection`. Knex services can also set `--table` and `--schemaName`.

```bash
bunx nuxt-feathers-zod@6.7.37 add service audit-events \
  --adapter knex \
  --connection reporting \
  --table audit_events \
  --schemaName reporting \
  --schema zod
```

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

<!-- release-version: 6.7.37 -->
