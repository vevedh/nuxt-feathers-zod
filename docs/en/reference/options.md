---
editLink: false
---
# Module options

The `feathers` block controls the embedded server, the client, transports, authentication, databases and administration services. Keep runtime-affecting choices explicit in `nuxt.config.ts`.

## Minimal embedded setup

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],
    client: { mode: 'embedded', pinia: true },
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: { path: '/socket.io' },
    },
  },
})
```

## Console and Builder services

```ts
console: {
  enabled: true,
  allowWrite: false,
  servicesDirs: ['services'],
  legacyNitroRoutes: false,
}
```

| Option | Default | Description |
|---|---:|---|
| `enabled` | `false` | Registers the internal Feathers services under `nfz/*` |
| `basePath` | `/console` | Console page base path when pages are mounted |
| `allowWrite` | development only | Allows schema, manifest, RBAC and preset writes |
| `servicesDirs` | root option | Overrides the directories inspected by the console |
| `legacyNitroRoutes` | `true` in the 6.x line | Keeps deprecated `/api/nfz/**` compatibility facades |

New applications should disable the Nitro facades and use `useBuilderClient()` or `client.service('nfz/...')`.

## Main option groups

- `client`: embedded or remote client, Pinia integration and remote authentication.
- `transports`: REST and Socket.IO paths and settings.
- `server`: embedded runtime, framework and server modules.
- `auth`: Feathers authentication service and strategies.
- `keycloak`: browser SSO and optional server bridge.
- `database.mongo`: MongoDB connection and management services.
- `validator`: Zod and JSON schema validation settings.
- `templates`: explicit generated-template overrides.
- `console`: Feathers Builder and diagnostic services.

Use private runtime configuration for database URLs and secrets. Do not serialize them into public configuration or generated source files.

<!-- release-version: 6.5.49 -->
