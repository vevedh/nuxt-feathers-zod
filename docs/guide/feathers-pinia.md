---
title: Migration depuis Feathers-Pinia
description: Migrer une application NFZ vers le client Feathers natif, @pinia/nuxt et useSessionStore.
---

# Migration depuis Feathers-Pinia

Depuis **6.5.21**, `nuxt-feathers-zod` ne s’appuie plus sur `feathers-pinia` pour son runtime client standard.

La nouvelle règle est volontairement plus simple :

- `$api` est toujours le client Feathers natif ;
- `@pinia/nuxt` sert aux stores applicatifs ;
- l’authentification passe par `useSessionStore()` et le middleware `session` ;
- les accès CRUD passent par `$api.service(path)` ou `useService(path)`.

## Avant

```ts
const { piniaClient } = useFeathers()
const users = await piniaClient.service('users').find()
```

## Après

```ts
const usersService = useService('users')
const users = await usersService.find({ query: { $limit: 20 } })
```

Ou directement :

```ts
const { $api } = useNuxtApp()
const users = await $api.service('users').find({ query: { $limit: 20 } })
```

## Authentification

```ts
const session = useSessionStore()

await session.login({
  strategy: 'local',
  userId,
  password,
})

await session.logout()
```

`useAuthStore()` reste un alias rétrocompatible de `useSessionStore()`.

## Configuration recommandée

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],

  feathers: {
    client: {
      mode: 'embedded',
      pinia: {
        storesDirs: ['stores'],
        session: {
          redirectTo: '/login',
          publicRoutes: ['/', '/login'],
        },
      },
    },
  },
})
```

`client.pinia` conserve une compatibilité de forme avec les anciennes configurations, mais ne génère plus de stores de cache de services.

## Pourquoi ce changement ?

Cette approche réduit les problèmes d’interop CommonJS/ESM côté navigateur, simplifie le debugging Nuxt 4/Vite et rend le flux d’authentification plus lisible.
