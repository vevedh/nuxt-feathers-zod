---
editLink: false
---

> `feathers-pinia` is optional. For a standard Feathers client, `useAuthRuntime()` and calls through `$api`/`useAdminFeathers()` are enough. See [Optional Feathers-Pinia](/en/guide/feathers-pinia).
# Frontend usage

The module injects a Feathers client into Nuxt and provides a consistent base for `useService()` and `feathers-pinia`.

## Example: new Nuxt 4 remote app

```bash
bunx nuxi@latest init my-nfz-frontend
cd my-nfz-frontend
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
bunx nuxt-feathers-zod add remote-service articles --path articles --methods find,get
bun dev
```

## `useService()`

```ts
const articles = useService('articles')
const res = await articles.find({ query: { $limit: 10 } })
const items = Array.isArray(res) ? res : res.data
```

## `useFeathers()`

```ts
const { api, client } = useFeathers()
await client.service('articles').find({ query: { $limit: 5 } })
```

## Component example

```vue
<script setup lang="ts">
const articles = useService('articles')
const items = ref<any[]>([])

onMounted(async () => {
  const res = await articles.find({ query: { $limit: 20 } })
  items.value = Array.isArray(res) ? res : res.data
})
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id ?? item._id">
      {{ item.title }}
    </li>
  </ul>
</template>
```

## Frontend auth

- local mode: `useAuth()` / `useAuthStore()` depending on setup
- Keycloak mode: bridge via `authentication.create(...)`
- remote JWT mode: `reAuthenticate()` when enabled

## Stabilization tips

- start with `useService()` for baseline examples
- keep richer abstractions in separately documented layers
- keep demo pages simple and reproducible
