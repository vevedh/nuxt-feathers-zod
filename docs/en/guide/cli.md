---
editLink: false
---
# CLI

The module ships with a CLI to generate services and boilerplate consistently.

## Add a database-backed service

```bash
bunx nuxt-feathers-zod add service <name>
```

This generates a complete **Zod-first** service:

- schema (Zod)
- service class
- hooks (validateQuery / validateData / resolvers)
- shared client registration (`*.shared.ts`)
- optional Swagger docs wiring (if enabled)

## Add a custom service (no adapter)

```bash
bunx nuxt-feathers-zod add custom-service <name>
```

Use this for **business logic / RPC / jobs** where you do not want a DB adapter.

### Options (typical)

- `--methods` Feathers standard methods (`find,get,create,patch,remove`)
- `--customMethods` custom RPC-like methods (e.g. `run,status,reindex`)
- `--auth` protect the service with JWT auth

### Example

```bash
bunx nuxt-feathers-zod add custom-service actions \
  --methods find \
  --customMethods run \
  --auth
```

Then in Nuxt:

```ts
const api = useNuxtApp().$api
await api.service('actions').run({ action: 'reindex' })
```

See: [Custom services](./custom-services)
