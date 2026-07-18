# Module process

## Nuxt setup order

`src/module.ts` runs the following process:

1. `resolveOptions()`
2. `applyRuntimeConfig()`
3. `applyConsoleLayer()` for optional legacy Nitro facades
4. `applyAliases()`
5. `applyTypeIncludes()`
6. websocket Nitro configuration when enabled
7. `applyServerLayer()`
8. `applyClientLayer()`
9. `applyDevtoolsLayer()`
10. `applyMcpLayer()`

## Embedded server startup

```text
infrastructure
  ↓
modules:pre
  ↓
plugins
  ↓
services
  ↓
modules:post
  ↓
app.setup()
  ↓
REST and Socket.IO routers
  ↓
ready
```

Socket.IO router creation is awaited. Readiness is resolved only after routers are created.

## Service discovery

`servicesDirs` is resolved from the Nuxt root. Absolute paths stay absolute. The deterministic discovery manifest is reused by imports, schemas, NFZ console services, and diagnostics.

## NFZ services

When `console.enabled` is active, `nfz/services`, `nfz/schemas`, `nfz/manifest`, `nfz/builder`, `nfz/status`, `nfz/rbac`, `nfz/presets`, and `nfz/init` are registered before `app.setup()`.

## Teardown

Teardown is idempotent: the runtime closes Feathers, closes the owned `MongoClient`, unregisters the instance, and remains safe when called again.

<!-- release-version: 6.5.49 -->
