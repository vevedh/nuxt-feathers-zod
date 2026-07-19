# nuxt-feathers-zod

`nuxt-feathers-zod` integrates FeathersJS v5 (Dove), Zod schemas and typed service access into Nuxt 4.
It is designed for applications that need a real backend contract inside a Nuxt project, while keeping the option to connect to an external Feathers API.

Current reference version: **6.6.0**.

Runtime baseline for `6.6.0`: Node.js `^22.12.0 || ^24.11.0 || >=26.0.0` and Bun `>=1.3.6`.
The embedded Nitro bridge now uses `@vevedh/feathers-nitro@0.5.0`; this release preserves the existing single-instance behavior while preparing a future opt-in multi-instance configuration.


## What the module provides

- Embedded Feathers server mounted in Nuxt/Nitro.
- Remote Feathers client mode for an existing backend.
- Service generation through the CLI.
- Zod-first schemas, resolvers, query validation and TypeScript types.
- Extensible local, JWT, OIDC, API-key and custom authentication provider registry, plus Keycloak-oriented remote flows.
- REST and Socket.io transports.
- MongoDB support and optional MongoDB management endpoints.
- Feathers-first Builder and diagnostic services under `nfz/*`.
- Runtime composables for client, service, authentication and protected service access.
- VitePress documentation in French and English.

## Installation

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
    transports: {
      rest: { enabled: true, path: '/feathers' },
      websocket: { enabled: true },
    },
    auth: {
      providers: {
        local: {
          type: 'local',
          usernameField: 'email',
          passwordField: 'password',
        },
        jwt: { type: 'jwt' },
      },
    },
  },
})
```

## Recommended initialization

Use the official CLI instead of creating service folders manually.

```bash
bunx nuxt-feathers-zod init embedded --auth --database mongodb
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
bunx nuxt-feathers-zod doctor
```

The CLI writes a service manifest under `services/.nfz/manifest.json`, generates the service files and keeps the expected module conventions aligned with the runtime scanner.

## Runtime usage

```vue
<script setup lang="ts">
const articles = useService('articles')

const { data } = await useAsyncData('articles', async () => {
  return await articles.find({
    query: { $limit: 20, $sort: { createdAt: -1 } },
  })
})
</script>

<template>
  <pre>{{ data }}</pre>
</template>
```

Authentication is exposed through `useAuth()` and `useAuthRuntime()`.

```ts
const auth = useAuth()

await auth.authenticate({
  strategy: 'local',
  email: 'admin@example.local',
  password: '<user-password>',
})
```

## Builder and diagnostic services

Enable the console to register the internal Feathers services used for schema inspection, previews, manifests and RBAC:

```ts
feathers: {
  console: {
    enabled: true,
    allowWrite: false,
    legacyNitroRoutes: false,
  },
}
```

```ts
const builder = useBuilderClient()
const schema = await builder.getSchema('articles')
```

The legacy `/api/nfz/**` routes are optional compatibility facades. New code should use `useBuilderClient()` or `client.service('nfz/...')`.

## Embedded and remote modes

### Embedded mode

Use embedded mode when the Nuxt application owns the backend.
The Feathers application is created inside the Nuxt/Nitro server layer, services are scanned from `servicesDirs`, and the Nuxt app can expose both REST and Socket.io transports.

### Remote mode

Use remote mode when the backend is already hosted elsewhere.
The Nuxt app initializes a Feathers client, connects to the configured backend URL and can still use the same composables for service access.

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --auth
```

## Documentation

The documentation is available in the `docs/` directory and is structured around:

- developer onboarding;
- CLI reference;
- configuration reference;
- runtime composables;
- services and hooks;
- authentication;
- production readiness.

Run it locally with:

```bash
cd docs
bun install
bun run dev
```

## Production checklist

Before publishing or deploying an application using this module:

1. Run `bunx nuxt-feathers-zod doctor`.
2. Verify `feathers.servicesDirs` and the generated `services/.nfz/manifest.json`.
3. Validate provider names, OIDC issuer/audience values and API-key scopes.
4. Configure `NFZ_AUTH_SECRET` or asymmetric signing keys; production startup rejects unsafe defaults.
5. Disable destructive MongoDB management actions unless explicitly required.
6. Build the app and run at least one smoke scenario for authentication and one protected service.

## License

MIT
