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


## `server`

```ts
server: {
  enabled: true,
  secureDefaults: true,
  allowMissingDatabaseServices: false,
  duplicateServicePolicy: 'error',
  bootstrapDiagnostics: false,
  loadOrder: ['modules:pre', 'plugins', 'services', 'modules:post'],
}
```

| Option | Default | Description |
|---|---:|---|
| `enabled` | `true` | Enables the embedded Feathers runtime |
| `secureDefaults` | `true` | Enables the secure middleware baseline |
| `allowMissingDatabaseServices` | `false` | Allows an unavailable persistent service to be skipped only when it is deliberately optional |
| `duplicateServicePolicy` | `error` | Rejects duplicate Feathers paths and reports both registrar sources. `skip` explicitly keeps the first registration. |
| `bootstrapDiagnostics` | `false` | Enables structured, non-sensitive `[NFZ bootstrap]` traces. |
| `modules` | `[]` | Adds custom server modules |
| `loadOrder` | standard phases | Controls pre-modules, plugins, services and post-modules order |

Keep `allowMissingDatabaseServices` disabled for required production services. Skipped optional registrars are exposed through `nfz/status`.

## `database.connections`

Named SQL connections resolve an explicit Knex client and driver before startup. Supported SQL `type` values are `postgresql`, `mysql`, `mariadb`, `sqlite`, and `mssql`. Standard driver packages are respectively `pg`, `mysql2`, `mysql2`, `better-sqlite3`, and `tedious`. Server SQL engines default to `pool: { min: 0, max: 10 }`; SQLite is constrained to `max: 1`. `searchPath` is primarily useful with PostgreSQL and MSSQL. Connection values and credentials remain private; diagnostics expose only redacted metadata and capabilities.

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

<!-- release-version: 6.7.51 -->
