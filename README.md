# nuxt-feathers-zod

`nuxt-feathers-zod` integrates FeathersJS v5 (Dove), Zod schemas and typed service access into Nuxt 4.
It is designed for applications that need a real backend contract inside a Nuxt project, while keeping the option to connect to an external Feathers API.

Current reference version: **6.7.51**.

Runtime baseline for `6.7.39`: Node.js `^22.19.0 || ^24.11.0 || >=26.0.0` and Bun `>=1.3.6` (release validation is recommended with Bun 1.3.14).
The embedded Nitro bridge uses `@vevedh/feathers-nitro@0.6.0` with FeathersJS 5.0.49, Nuxt 4.5.2 and Vue 3.5.42; Nitro 2.13.4 and H3 1.15.11 remain deliberately frozen on this train.


## What the module provides

- Embedded Feathers server mounted in Nuxt/Nitro.
- Remote Feathers client mode for an existing backend.
- Service generation through the CLI, including portable `objectid`, UUID, integer, decimal-string bigint and string identifier strategies.
- Zod-first schemas, resolvers, query validation and TypeScript types.
- Extensible local, JWT, OIDC, API-key and custom authentication provider registry, plus Keycloak-oriented remote flows.
- REST and Socket.io transports.
- Named MongoDB and Knex connections (PostgreSQL, MySQL, MariaDB, SQLite and Microsoft SQL Server), with explicit SQL drivers, safe pool defaults, single-connection transaction helpers, redacted diagnostics, and optional MongoDB management endpoints. MongoDB, PostgreSQL, MySQL, MariaDB, SQLite and MSSQL are certified by exact-candidate real-engine gates; MSSQL certification uses SQL Server 2025 with `tedious`, an isolated database/schema, and candidate-bound teardown evidence.
- Redis cache integration through Nitro/Unstorage for server routes and cache-aside business patterns; NFZ 6.7.51 does **not** expose a native `feathers.cache` option.
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
bunx nuxt-feathers-zod init embedded --auth --framework express
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
bunx nuxt-feathers-zod doctor
```

The CLI writes a service manifest under `services/.nfz/manifest.json`, generates the service files and keeps the expected module conventions aligned with the runtime scanner.

## Examples

The repository now contains a small progression of maintained examples in [`examples/`](./examples/):

- `minimal-embedded-memory` — smallest embedded Feathers + Zod example, no database;
- `nfz-quasar-unocss-pinia-starter` — complete Nuxt 4 + Quasar 2 + Pinia + MongoDB + local-auth starter;
- `real-world-nuxt4-daisyui-pinia-redis` — Nuxt 4 + DaisyUiKit + Pinia + MongoDB + local/JWT + RBAC + Redis cache integration;
- `remote-rest-minimal` — remote REST client for an existing Feathers backend;
- `sql-knex-named-connections` — PostgreSQL/MySQL/MariaDB named-connection recipe;
- Keycloak/LDAP SPA and SSR reference applications for SSO integration.

Start with [`examples/README.md`](./examples/README.md) to choose the smallest relevant path.

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
const databases = await builder.getDatabaseConnections()
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
