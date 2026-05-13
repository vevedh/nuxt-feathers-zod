# Production readiness

This page lists the checks to perform before shipping an application based on `nuxt-feathers-zod`.

## Goal

A production-ready application should have:

- a clear Nuxt configuration;
- services generated or structured according to the module conventions;
- tested authentication flows;
- a strict separation between public configuration and server secrets;
- dangerous administration actions disabled by default;
- operational documentation that the project team can understand quickly.

## Quick checklist

```bash
bunx nuxt-feathers-zod doctor
bunx nuxi prepare
bun run typecheck
bun run build
```

Then verify:

- the `services/` directory exists when `feathers.servicesDirs` is `['services']`;
- `services/.nfz/manifest.json` matches the actual services;
- authentication strategies declared in `feathers.auth` exist on the backend;
- sensitive environment variables are not exposed through `public` runtime config;
- remote URLs are correct for REST and Socket.io;
- protected routes redirect correctly when no session is available.

## Recommended minimal configuration

```ts
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
      enabled: true,
      strategies: ['local', 'jwt'],
    },
    database: {
      mongodb: {
        enabled: true,
        url: process.env.MONGO_URL,
      },
    },
  },
})
```

## Services

The recommended workflow is to generate services through the CLI.

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
```

This keeps the following elements aligned:

- the `.nfz` manifest;
- naming conventions;
- schemas;
- hooks;
- shared imports;
- runtime scanner compatibility.

## Authentication

For local/JWT authentication:

```bash
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod
```

For a remote application using Keycloak:

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport socketio \
  --auth \
  --payloadMode keycloak \
  --tokenField access_token
```

In production, validate the flow in these situations:

- initial login;
- browser refresh;
- token expiration;
- protected route;
- protected service call;
- logout;
- authentication failure.

## MongoDB management

MongoDB administration endpoints should stay conservative.

Recommended defaults:

- enable read access only when needed;
- keep database and collection creation disabled;
- keep document deletion disabled;
- keep drop database and drop collection disabled;
- limit access to an allowlist of databases when possible.

## Runtime config

Public values may be exposed through `runtimeConfig.public._feathers`.
Secrets must stay in private runtime config or server-side environment variables.

Never expose these values to the client:

- a full MongoDB URL with credentials;
- JWT secrets;
- confidential Keycloak secrets;
- SMTP credentials;
- administration keys.

## Suggested smoke tests

Before delivery:

1. Start the app in a local production mode.
2. Verify `/feathers` or the configured REST path.
3. Sign in with a test account.
4. Call a public service.
5. Call a protected service.
6. Verify session restoration after refresh.
7. Check server logs for authentication failures.
8. Trigger a controlled error and verify how it appears in the UI.

## Best practices

- Do not create services manually when the CLI can generate them.
- Version the `.nfz` manifest.
- Keep business hooks close to the service.
- Encapsulate critical access through composables or domain stores.
- Avoid scattered direct `$api.service(...)` calls in sensitive pages.
- Keep destructive actions disabled by default.
