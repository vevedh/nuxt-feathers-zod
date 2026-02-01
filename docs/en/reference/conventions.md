---
editLink: false
---
# Conventions

## Root owns everything

Declare Feathers/Mongo/Schema dependencies at the repository root to avoid type-check issues in the playground.

## No pnpm / no `catalog:`

- remove pnpm files
- replace `catalog:` versions with semver compatible with Bun
- set `packageManager` to Bun

## Custom methods (SSR-safe + transport-agnostic)

- never declare a custom method in `methods` unless it exists on the client service
- in SSR: register native methods only
- in browser: patch custom methods before `client.use()`
- order: `remote.run` -> `remote.request` -> `remote.send` -> HTTP fallback
