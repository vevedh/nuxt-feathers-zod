---
editLink: false
---

> `feathers-pinia` est optionnel. Pour un client Feathers standard, `useAuthRuntime()` et les appels via `$api`/`useAdminFeathers()` suffisent. Consultez [Feathers-Pinia optionnel](/guide/feathers-pinia).
# Utilisation côté frontend

Le module injecte un client Feathers dans Nuxt et fournit une base cohérente pour travailler avec `useService()` et `feathers-pinia`.

## Exemple : nouvelle app Nuxt 4 remote

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

## Exemple de composant

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

## Auth côté frontend

- mode local : `useAuth()` / `useAuthStore()` selon le setup
- mode Keycloak : bridge via `authentication.create(...)`
- mode remote JWT : `reAuthenticate()` si activé

## Conseils de stabilisation

- commencer par `useService()` pour les exemples de base
- réserver les abstractions plus riches à des couches documentées séparément
- garder les pages de démo simples et reproductibles
