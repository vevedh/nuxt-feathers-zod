# Feathers and Zod services

A service is the primary functional unit of `nuxt-feathers-zod`. The CLI generates the structure expected by service discovery and schema tooling.

## Standard service

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --collection articles --schema zod
```

Supported generated adapters are `memory` and `mongodb`. Schema modes are `none`, `zod`, and `json`.

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
bunx nuxt-feathers-zod auth service articles --enabled true
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

<!-- release-version: 6.5.47 -->
