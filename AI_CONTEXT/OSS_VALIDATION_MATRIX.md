## v6.4.19

- Release-consistency stabilization: docs/version markers aligned on 6.4.19, CLI build wrapped in Node for Windows/npm predictability, and release metadata sanity check added.

# OSS validation matrix

This file is the practical reference for validating the open-source core after the OSS-1/OSS-2/OSS-3 stabilization passes.

## Canonical matrix

### Embedded

1. embedded + express + local auth
2. embedded + express + mongodb
3. embedded + koa + no auth
4. embedded + koa + mongodb
5. embedded + express + swagger

### Remote

1. remote + rest
2. remote + socketio + jwt
3. remote + socketio + keycloak
4. remote + auto transport + declared services

## Repository-level checks

```bash
bun install
bun run module:build
bunx nuxi@latest build
bun run cli:smoke
bun test
```

## Playground checks

Use the scenario files in `playground/` and validate:

- `/validation`
- `/tests`
- `/messages`
- `/users`
- `/mongos`
- NFZ DevTools tab

## Diagnostic rules

- Runtime-generated files under `.nuxt/feathers/server/**` must remain parseable as JavaScript.
- Type-only declarations must live in generated `.d.ts` files.
- In embedded mode, `servicesDirs` and schema exports are the source of truth for service detection.
- In remote mode, `client.remote.services` is the source of truth for declared services.

## PATCH 6.4.8
- objectif: idempotence complète du module pendant bun install / nuxt prepare
- déduplication des alias Vite, optimizeDeps.include, tsConfig.include et modules @pinia/nuxt
- cible: empêcher les empilements côté module après une configuration CLI déjà propre
