---
title: Migration from Feathers-Pinia
description: Move an NFZ application to the native Feathers client, @pinia/nuxt, and useSessionStore.
---

# Migration from Feathers-Pinia

Since **6.5.21**, `nuxt-feathers-zod` no longer uses `feathers-pinia` as its standard client runtime.

The client contract is intentionally simpler:

- `$api` is the native Feathers client;
- `@pinia/nuxt` is used for explicit application stores;
- authentication state is handled by `useSessionStore()` and the `session` middleware;
- CRUD operations use `$api.service(path)` or `useService(path)`.

## Before

```ts
const { piniaClient } = useFeathers()
const users = await piniaClient.service('users').find()
```

## Current runtime

```ts
const usersService = useService('users')
const users = await usersService.find({
  query: { $limit: 20 },
})
```

Or use the injected client directly:

```ts
const { $api } = useNuxtApp()
const users = await $api.service('users').find({
  query: { $limit: 20 },
})
```

`useService()` returns a Feathers service. It does not expose historical store methods such as `useFind()`, `useGet()`, or `usePatch()`.

## Authentication

```ts
const session = useSessionStore()

await session.login({
  strategy: 'local',
  userId,
  password,
})

await session.logout()
```

`useAuthStore()` remains a compatibility alias for `useSessionStore()`.

## Recommended configuration

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

`client.pinia` keeps configuration-shape compatibility with older projects, but it does not generate service cache stores.

## Why this contract is simpler

The native Feathers client avoids fragile CommonJS/ESM interoperability in the browser, keeps Nuxt 4 and Vite debugging straightforward, and separates transport concerns from application state.

<!-- release-version: 6.5.47 -->
