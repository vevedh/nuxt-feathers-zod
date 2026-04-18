---
editLink: false
---
# CLI

The CLI `bunx nuxt-feathers-zod` is the **official method** to initialize a Nuxt 4 app, generate NFZ-compatible artifacts and diagnose an existing project.

This page is aligned with the OSS command surface stabilized for release **6.4.120**.

## Entry command

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

## Official OSS CLI surface

### Recommended public core

- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add remote-service <name>`
- `add file-service <name>`
- `add middleware <name>`
- `schema <service>`
- `auth service <name>`
- `mongo management`
- `doctor`

### Secondary commands / compatibility aliases

- `add custom-service <name>`
- `init templates`
- `templates list`
- `plugins list|add`
- `modules list|add`
- `middlewares list|add`
- `add server-module <name>`
- `add mongodb-compose`


### Initialization

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`

### Services

- `add service <name>`
- `add service <name> --custom`
- `add remote-service <name>`
- `add file-service <name>`
- `auth service <name>`
- `schema <service>`

### Runtime artifacts

- `add middleware <name>`
- `add server-module <name>`
- `add mongodb-compose`
- `mongo management`

### OSS asset helpers

- `templates list`
- `plugins list`
- `plugins add <name>`
- `modules list`
- `modules add <name>`
- `middlewares list`
- `middlewares add <name>`

### Diagnostics

- `doctor`


## Differences between `plugin`, `server-module`, `module`, `client-module`, `hook`, `policy`

These targets are not equivalent. The right way to choose is: **where the file is generated, when it runs, and which problem it solves**.

### `plugin`

A `plugin` is a **global server-side Feathers plugin**.

Associated CLI command:

```bash
bunx nuxt-feathers-zod plugins add audit-bootstrap
```

Generated file:

```txt
server/feathers/audit-bootstrap.ts
```

Use it when:
- you need to attach global logic to the Feathers application
- you want to register `app.hooks({ setup: [...] })`
- you need cross-cutting server bootstrap code

Example usage:

```ts
import { auditBootstrap } from '~/server/feathers/audit-bootstrap'

export default defineNitroPlugin(async () => {
  // the NFZ runtime loads the server plugin
})
```

Typical cases: global logging, metrics, application-level bootstrap hooks.

### `server-module`

A `server-module` is a **server infrastructure module** loaded around the Feathers/Nitro runtime.

Associated CLI command:

```bash
bunx nuxt-feathers-zod add server-module security-headers
```

Generated file:

```txt
server/feathers/modules/security-headers.ts
```

Use it when:
- you need to add HTTP headers
- you want to wire `helmet`, rate-limit, healthcheck, request logger
- you are modifying the server layer more than Feathers business logic

Example usage:

```ts
export default async function securityHeaders(app: any) {
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Frame-Options', 'DENY')
    next()
  })
}
```

Typical cases: HTTP hardening, health endpoints, Express/Koa middleware.

### `module`

`module` is currently **a practical alias for `server-module`** in the CLI.

Associated CLI command:

```bash
bunx nuxt-feathers-zod add middleware request-logger --target module
```

Generated file:

```txt
server/feathers/modules/request-logger.ts
```

Use it when:
- you prefer the shorter `module` target
- otherwise prefer `server-module`, which is clearer in the docs

Example usage:

```bash
bunx nuxt-feathers-zod add middleware healthcheck --target module
```

Same usage family as `server-module`.

### `client-module`

A `client-module` is a **Nuxt client plugin** loaded only in the browser.

Associated CLI command:

```bash
bunx nuxt-feathers-zod add middleware api-debug --target client-module
```

Generated file:

```txt
app/plugins/api-debug.client.ts
```

Use it when:
- you want to enrich `$api`
- you need client-side diagnostics
- you want browser-side telemetry

Example usage:

```ts
export default defineNuxtPlugin((nuxtApp) => {
  console.info('[nfz] client module ready', !!nuxtApp.$api)
})
```

Typical cases: Feathers client debugging, frontend instrumentation, browser-only helpers.

### `hook`

A `hook` is a **reusable Feathers hook function**.

Associated CLI command:

```bash
bunx nuxt-feathers-zod add middleware attach-tenant --target hook
```

Generated file:

```txt
server/feathers/hooks/attach-tenant.ts
```

Use it when:
- you need to enrich `context.params`
- you want to transform `context.data`
- you need reusable before/after/around logic

Example usage:

```ts
import { attachTenant } from '../hooks/attach-tenant'

export const before = {
  all: [attachTenant()]
}
```

Typical cases: multi-tenant context, data normalization, context enrichment.

### `policy`

A `policy` is a specialized **authorization guard**.

Associated CLI command:

```bash
bunx nuxt-feathers-zod add middleware is-admin --target policy
```

Generated file:

```txt
server/feathers/policies/is-admin.ts
```

Use it when:
- you need explicit allow/deny logic
- you want a centralized RBAC rule
- you want to protect a service or a method

Example usage:

```ts
import { isAdminPolicy } from '../policies/is-admin'

export const before = {
  all: [isAdminPolicy()]
}
```

Typical cases: admin-only, same-user-or-admin, business access control rules.

### Practical summary

- `plugin`: global server-side Feathers extension
- `server-module`: server/infrastructure extension
- `module`: alias of `server-module`
- `client-module`: Nuxt client plugin
- `hook`: reusable Feathers hook logic
- `policy`: authorization-focused hook

## Minimum stability check

```bash
bunx nuxt-feathers-zod --help
bunx nuxt-feathers-zod doctor
```

## Recommended path: new Nuxt 4 app

### Embedded

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

### Embedded + local auth

```bash
bunx nuxi@latest init my-nfz-auth
cd my-nfz-auth
bun install
bun add nuxt-feathers-zod feathers-pinia feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --auth --swagger
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod --collection users --idField _id --docs
bun dev
```

### Remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Important DX rules

- **default adapter = `memory`**
- **default schema = `none`**
- **recommended `servicesDirs` = `['services']`**
- in embedded mode, **generate services through the CLI**
- in remote mode, `transport: auto` currently resolves to **socketio**
- `add custom-service` remains supported, but the public recommended form is `add service <name> --custom`

## `init templates`

Initializes a template override directory.

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates
```

Useful flags:

- `--dir <dir>`
- `--force`
- `--dry`
- `--diff`

## `init embedded`

Initializes **embedded** mode: a Feathers server inside Nitro.

```bash
bunx nuxt-feathers-zod init embedded --force
```

Important flags:

- `--framework express|koa`
- `--servicesDir <dir>`
- `--restPath <path>`
- `--websocketPath <path>`
- `--websocketTransports <list>`
- `--websocketConnectTimeout <ms>`
- `--websocketCorsOrigin <value>`
- `--websocketCorsCredentials true|false`
- `--websocketCorsMethods <list>`
- `--secureDefaults true|false`
- `--cors true|false`
- `--compression true|false`
- `--helmet true|false`
- `--bodyParserJson true|false`
- `--bodyParserUrlencoded true|false`
- `--serveStatic true|false`
- `--serveStaticPath <path>`
- `--serveStaticDir <dir>`
- `--serverModulesPreset <name>`
- `--expressBaseline`
- `--auth true|false`
- `--swagger true|false`
- `--force`
- `--dry`

## `init remote`

Initializes **remote** mode: a Feathers client against an external server.

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
```

Important flags:

- `--url <http(s)://...>`
- `--transport socketio|rest|auto`
- `--restPath <path>`
- `--websocketPath <path>`
- `--websocketTransports <list>`
- `--websocketConnectTimeout <ms>`
- `--websocketCorsOrigin <value>`
- `--websocketCorsCredentials true|false`
- `--websocketCorsMethods <list>`
- `--auth true|false`
- `--payloadMode jwt|keycloak`
- `--strategy <name>`
- `--tokenField <name>`
- `--servicePath <path>`
- `--reauth true|false`
- `--force`
- `--dry`

## `remote auth keycloak`

Configures the Keycloak bridge in the app.

```bash
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm myrealm --clientId myapp
```

## `add service <name>`

Generates an embedded service.

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --collection users --idField _id
```

Useful flags:

- `--custom`
- `--type adapter|custom`
- `--adapter memory|mongodb`
- `--schema none|zod|json`
- `--auth true|false`
- `--authAware true|false`
- `--idField id|_id`
- `--path <servicePath>`
- `--collection <name>`
- `--methods find,get,create,patch,remove`
- `--customMethods run,preview`
- `--docs true|false`
- `--servicesDir <dir>`
- `--force`
- `--dry`

### Auth-aware `users` generation

`--auth` protects service methods with JWT hooks. `--authAware` controls local-auth-specific password handling.

Examples:

```bash
bunx nuxt-feathers-zod add service users --auth --schema none --adapter memory --force
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id --force
bunx nuxt-feathers-zod add service users --auth --authAware false --schema json --adapter memory --force
```

## `add remote-service <name>`

Adds a client-only service into `feathers.client.remote.services`.

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
```

## `auth service <name>`

Enables or disables JWT auth hooks on an existing embedded service.

```bash
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod auth service users --enabled false
```

## `schema <service>`

Inspects or mutates the service manifest schema state.

```bash
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --json
bunx nuxt-feathers-zod schema users --set-mode zod
bunx nuxt-feathers-zod schema users --add-field title:string!
bunx nuxt-feathers-zod schema users --rename-field title:headline
```

Main flags:

- `--show`
- `--json`
- `--export`
- `--get`
- `--set-mode none|zod|json`
- `--add-field <spec>`
- `--remove-field <name>`
- `--set-field <spec>`
- `--rename-field <from:to>`
- `--validate`
- `--repair-auth`
- `--diff`
- `--servicesDir <dir>`
- `--force`
- `--dry`

`--validate` checks manifest ↔ generated-files coherence. `--repair-auth` restores the expected baseline for an auth-compatible `users` service. `--diff` helps inspect drift before writing changes.

## `add middleware <name>`

Generates a middleware artifact. Supported targets include Nitro middleware, Nuxt route middleware, Feathers plugins, hooks, policies, and embedded server modules.

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```

Supported targets:

- **recommended public targets**: `nitro`, `route`
- **advanced targets**: `feathers`, `server-module`, `module`, `client-module`, `hook`, `policy`

Public docs recommend starting with `nitro` and `route`. The other targets remain supported but mostly address expert or internal scaffolding needs.

## `add server-module <name>`

Directly generates an embedded server module in `server/feathers/modules`.

```bash
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add server-module express-baseline --preset express-baseline
```

## `add mongodb-compose`

Generates a `docker-compose-db.yaml` file to bootstrap MongoDB locally.

```bash
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod add mongodb-compose --out docker-compose-db.yaml --service mongodb --database app --rootUser root --rootPassword change-me
```

## `mongo management`

Enables or updates the embedded MongoDB management surface in `nuxt.config.*`.

```bash
bunx nuxt-feathers-zod mongo management   --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin   --enabled true   --auth false   --basePath /mongo
```

Useful flags:

- `--url <mongodb-url>`
- `--enabled true|false`
- `--auth true|false`
- `--basePath <path>`
- `--exposeDatabasesService true|false`
- `--exposeCollectionsService true|false`
- `--exposeUsersService true|false`
- `--exposeCollectionCrud true|false`
- `--dry`


Additional `mongo management` flags aligned with `feathers.database.mongo.*`:

- `--whitelistDatabases <csv>` → `feathers.database.mongo.management.whitelistDatabases`
- `--blacklistDatabases <csv>` → `feathers.database.mongo.management.blacklistDatabases`
- `--whitelistCollections <csv>` → `feathers.database.mongo.management.whitelistCollections`
- `--blacklistCollections <csv>` → `feathers.database.mongo.management.blacklistCollections`
- `--showSystemDatabases true|false` → `feathers.database.mongo.management.showSystemDatabases`
- `--allowCreateDatabase true|false` → `feathers.database.mongo.management.allowCreateDatabase`
- `--allowDropDatabase true|false` → `feathers.database.mongo.management.allowDropDatabase`
- `--allowCreateCollection true|false` → `feathers.database.mongo.management.allowCreateCollection`
- `--allowDropCollection true|false` → `feathers.database.mongo.management.allowDropCollection`
- `--allowInsertDocuments true|false` → `feathers.database.mongo.management.allowInsertDocuments`
- `--allowPatchDocuments true|false` → `feathers.database.mongo.management.allowPatchDocuments`
- `--allowReplaceDocuments true|false` → `feathers.database.mongo.management.allowReplaceDocuments`
- `--allowRemoveDocuments true|false` → `feathers.database.mongo.management.allowRemoveDocuments`

Canonical routes:

- `/mongo/databases` (legacy alias accepted: `/mongo`)
- `/mongo/<db>/collections`
- `/mongo/<db>/stats`
- `/mongo/<db>/<collection>/indexes`
- `/mongo/<db>/<collection>/count`
- `/mongo/<db>/<collection>/schema`
- `/mongo/<db>/<collection>/documents`
- `/mongo/<db>/<collection>/aggregate`

## OSS helpers: templates, plugins, modules, middlewares

### `templates list`

Lists available OSS templates.

```bash
bunx nuxt-feathers-zod templates list
```

### `plugins list` / `plugins add <name>`

```bash
bunx nuxt-feathers-zod plugins list
bunx nuxt-feathers-zod plugins add audit-log
```

The generator creates a Feathers server plugin based on `defineFeathersServerPlugin`.

### `modules list` / `modules add <name>`

```bash
bunx nuxt-feathers-zod modules list
bunx nuxt-feathers-zod modules add security-headers --preset security-headers
```

The generator creates a Feathers server module based on `defineFeathersServerModule`.

### `middlewares list` / `middlewares add <name>`

```bash
bunx nuxt-feathers-zod middlewares list --target nitro
bunx nuxt-feathers-zod middlewares add request-id --target nitro
```

## `doctor`

Quick diagnosis for the current project.

```bash
bunx nuxt-feathers-zod doctor
```

The report covers:

- client mode (`embedded` / `remote`)
- remote transport and target URL
- detected `servicesDirs`
- scanned local services
- remote Keycloak config
- Mongo management config with:
  - redacted URL
  - normalized `basePath`
  - computed route surface
  - warning when `management.enabled = true` but `database.mongo.url` is missing


## File upload/download starter

Dedicated command:

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```
