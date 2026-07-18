# Quick start

This workflow creates a Feathers backend embedded in Nuxt 4, generates a service, and validates the result.

## Install

```bash
bun add nuxt-feathers-zod
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

## Initialize embedded mode

```bash
bunx nuxt-feathers-zod init embedded --auth --framework express
```

The command updates `nuxt.config.*`. It does not create a second business API under `server/api`; business contracts remain Feathers services.

## Generate a service

```bash
bunx nuxt-feathers-zod add service articles --adapter memory --schema zod
```

MongoDB service:

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --collection articles --schema zod
```

Configure the MongoDB connection under `feathers.database.mongo`.

## Add schema fields

```bash
bunx nuxt-feathers-zod schema articles --add-field title:string!
bunx nuxt-feathers-zod schema articles --add-field published:boolean=false
bunx nuxt-feathers-zod schema articles --validate
```

The `!` suffix marks a required field.

## Use the service

```vue
<script setup lang="ts">
const articles = useService('articles')

const result = await articles.find({
  query: {
    $limit: 20,
    $sort: { createdAt: -1 },
  },
})
</script>
```

## Check the project

```bash
bunx nuxt-feathers-zod capabilities
bunx nuxt-feathers-zod doctor
```

Next: [Architecture](/en/reference/architecture), [Services](/en/reference/services), [Configuration](/en/reference/configuration), and [CLI](/en/reference/cli).

<!-- release-version: 6.5.49 -->
