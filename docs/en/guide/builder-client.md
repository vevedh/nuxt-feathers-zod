---
editLink: false
---
# Feathers Builder client

`useBuilderClient()` exposes schema, manifest and diagnostic tools through the module's Feathers services. It uses the same client, session, hooks and transports as application services.

## Enable the services

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    console: {
      enabled: true,
      allowWrite: false,
      legacyNitroRoutes: false,
    },
  },
})
```

The module registers these services before `app.setup()`:

- `nfz/services`
- `nfz/schemas`
- `nfz/manifest`
- `nfz/builder`
- `nfz/status`
- `nfz/rbac`
- `nfz/presets`
- `nfz/init`

## Use the composable

```ts
const builder = useBuilderClient()

const discovery = await builder.getServices()
const schema = await builder.getSchema('messages')

const preview = await builder.preview({
  service: 'messages',
  fields: schema.fields,
})
```

Direct Feathers calls remain available:

```ts
const { $api } = useNuxtApp()

const schema = await $api
  .service('nfz/schemas')
  .get('messages')
```

The contract works over REST, Socket.IO and direct server-side service calls.

## Authentication and writes

When local authentication is enabled, external calls pass through `authenticate('jwt')`. Keycloak bridge calls require a resolved user as well. All input is validated before filesystem access.

Write methods also require `console.allowWrite: true`. Keep writes disabled in production unless the administration workflow explicitly needs them.

## Legacy Nitro compatibility

The 6.x line can keep `/api/nfz/**` as deprecated compatibility facades. Those handlers only delegate to Feathers services. New applications should set `legacyNitroRoutes: false` and use `useBuilderClient()` or `client.service(...)`.

<!-- release-version: 6.5.47 -->
