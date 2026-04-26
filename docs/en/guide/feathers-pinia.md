---
title: Optional Feathers-Pinia
description: Understand when to enable feathers-pinia in nuxt-feathers-zod and when to use only the standard Feathers client.
---

# Optional Feathers-Pinia

Since the **6.5.4** baseline, `nuxt-feathers-zod` clearly separates two layers:

- **Application Pinia** (`@pinia/nuxt`): regular UI stores, session, theme, local state.
- **Feathers-Pinia** (`feathers-pinia`): Feathers service stores, client cache, helpers such as `useFind()` / `useGet()`.

These layers are not equivalent. An application can use `@pinia/nuxt` without enabling `feathers-pinia`.

## Recommended configuration for NFZ Studio

NFZ Studio uses `useAuthRuntime()`, `useStudioSessionStore()` and `useAdminFeathers()`. It does not need Feathers-Pinia service stores.

```ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'embedded',
      pinia: false,
    },
  },
})
```

This keeps Pinia available for application stores while preventing `feathers-pinia` from entering the browser graph.

## Explicitly enabling Feathers-Pinia

Enable `feathers.client.pinia` only when you want Feathers service stores.

```ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'embedded',
      pinia: {
        idField: 'id',
        services: {
          users: { idField: '_id' },
        },
      },
    },
  },
})
```

In this mode, NFZ adds the required Vite hints for `feathers-pinia` and Feathers client packages.

## Usage matrix

| Mode | Feathers client | Auth runtime | Feathers-Pinia |
|---|---:|---:|---:|
| Embedded API without UI | No | No | No |
| Embedded + standard client | Yes | Depends on `auth` | No |
| Remote REST/Socket.IO | Yes | Depends on remote auth | Off by default |
| Remote + Keycloak | Yes | Yes | Off by default |
| Client CRUD with stores | Yes | As needed | Yes, explicitly |

## Stability rule

`feathers-pinia` must never be imported at the top level of the standard runtime client. It is dynamically loaded only when `feathers.client.pinia` is enabled. This avoids Vite/browser errors around CommonJS exports from `@feathersjs/feathers`.
