# Utilisation côté frontend (useService, Pinia)

Le module expose un client Feathers dans Nuxt via le plugin runtime. Tu utilises ensuite :

- `useService('<path>')` (simple)
- `feathers-pinia` (stores réactifs)

## `useService`

```ts
const articles = useService('articles')
const list = await articles.find({ query: { $limit: 10 } })
```

`ServiceTypes` est généré à partir des services détectés dans `feathers.servicesDirs`.

## Feathers-Pinia

Le module expose aussi les helpers `feathers-pinia` via les auto-imports Nuxt (car `runtime/composables` est ajouté dans `addImportsDir`).

```ts
// via auto-import Nuxt (recommandé)
// ou en import direct
import { useAuth, useServiceInstance } from 'feathers-pinia'

const auth = useAuth()
const articles = useServiceInstance('articles')
```

Dans la pratique, tu utilises surtout :

- `useAuth()` : état auth (mode auth locale)
- `useServiceInstance()` : instance de service
- `useDataStore()` : store normalisé

## Exemple UI (Nuxt UI / UCard)

```vue
<script setup lang="ts">
const articles = useService('articles')
const items = ref<any[]>([])

onMounted(async () => {
  const res = await articles.find({ query: { $limit: 20, $sort: { createdAt: -1 } } })
  items.value = Array.isArray(res) ? res : res.data
})
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2">
    <UCard v-for="a in items" :key="a._id">
      <template #header>
        <div class="font-semibold">
          {{ a.title }}
        </div>
      </template>
      <div class="text-sm opacity-80">
        {{ a.excerpt }}
      </div>
    </UCard>
  </div>
</template>
```

## Auth store (mode local)

Si `feathers.auth` est activé (et Keycloak désactivé), le module injecte `useAuthStore()`.

> En mode **Keycloak-only**, l’auth store local n’est pas chargé.
