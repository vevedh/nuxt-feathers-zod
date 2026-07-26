---
editLink: false
---
# Embedded runtime reliability

NFZ 6.7.2 hardens embedded startup when Nuxt 4 and Nitro mount Feathers under `/feathers` with Express.

## One business registration source

Use `servicesDirs` as the primary registration source:

```ts
export default defineNuxtConfig({
  feathers: {
    servicesDirs: ['services'],
    server: {
      loadOrder: ['modules:pre', 'plugins', 'services', 'modules:post'],
      duplicateServicePolicy: 'error',
    },
  },
})
```

Do not re-import the same registrars from a `server/feathers/plugins` aggregator. The doctor reports phase mixing and fails when services are discovered while `loadOrder` omits `services`.

## Idempotent bootstrap

An instance follows this state model:

```text
absent -> initializing -> ready
                     \-> failed
```

The lock is claimed before the Feathers application is created. Concurrent calls await the same promise; calls after `ready` return without replaying plugins, services, modules, routers or infrastructure hooks.

The `failed` state remains available with a safe `causeId`. The original startup error is never exposed to the browser.

## Duplicate services

The default policy is fail-closed:

```ts
server: {
  duplicateServicePolicy: 'error',
}
```

Diagnostics include the Feathers path and both sources. `skip` is an explicit migration policy: it keeps the first service and exposes the skipped registrar through `nfz/status`.

## Express REST bridge

The handler covers `/feathers`, `/feathers/` and `/feathers/**`:

- initializing runtime: JSON `503` with `Retry-After: 1`;
- failed bootstrap: JSON `503` with a safe `causeId`;
- ready runtime with an unknown service: Feathers JSON `404`;
- NFZ errors never fall through to Nuxt's HTML 404 page.

The bridge restores `req.url` and `req.originalUrl`, removes `finish`/`close` listeners and is compiled under `strict` plus `noImplicitAny`.

## Zod boundary

NFZ 6.7.x supports **Zod 3** as a shared peer runtime:

```json
{
  "dependencies": {
    "zod": "3.25.76"
  }
}
```

Application schemas, `zodQuerySyntax()` and `getZodValidator()` must resolve the same runtime. `doctor` reports versions, active paths and detected copies, and fails on Zod 4 or distinct active runtimes.

## Validation

```bash
bunx nuxt-feathers-zod doctor
bun run typecheck
bun run build
```

The package also validates its main starter from the packed tarball against a production Nitro server with real authentication and Express REST CRUD.

<!-- release-version: 6.7.37 -->
