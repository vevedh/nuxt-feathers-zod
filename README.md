# nuxt-feathers-zod

[Documentation](https://vevedh.github.io/nuxt-feathers-zod/)

`nuxt-feathers-zod` is the official **Nuxt 4** module that embeds or connects to **FeathersJS v5 (Dove)** with a **CLI-first** workflow and optional **Zod-first** service generation.

Current OSS release target: **6.3.8**.

It supports two main usage patterns:

- **embedded mode**: a Feathers server runs inside Nuxt/Nitro
- **remote mode**: a Nuxt app uses a Feathers client against an external API

## Open source scope

The public OSS module includes:

- Nuxt 4 + Nitro integration
- embedded and remote modes
- REST and Socket.IO transports
- embedded server with **Express** or **Koa**
- CLI bootstrap for `init embedded`, `init remote`, `init templates`
- CLI generation for services, remote services, plugins, modules, middleware and server modules
- schema modes `none | zod | json`
- local/JWT auth flows
- Keycloak SSO bridge for remote mode
- optional legacy Swagger support
- template overrides
- optional MongoDB management surface via `database.mongo.management`
- client-side helpers with Pinia / feathers-pinia support
- `doctor` diagnostics for mode, remote config, local services and Mongo management

## Installation

```bash
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

Optional Swagger dependencies:

```bash
bun add feathers-swagger swagger-ui-dist
```

## Quick start — embedded mode

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

## Embedded mode with local auth

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

## Remote mode quick start

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

## Canonical CLI commands

### Bootstrap and diagnostics

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm myrealm --clientId myapp
bunx nuxt-feathers-zod doctor
bunx nfz --help
```

### Services and schema

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --collection users --idField _id
bunx nuxt-feathers-zod add service users --auth --authAware --schema zod --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --set-mode zod
bunx nuxt-feathers-zod schema users --add-field title:string!
```

### Runtime helpers and scaffolding

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
```

### Open OSS asset commands

```bash
bunx nuxt-feathers-zod templates list
bunx nuxt-feathers-zod plugins list
bunx nuxt-feathers-zod plugins add audit-log
bunx nuxt-feathers-zod modules list
bunx nuxt-feathers-zod modules add security-headers --preset security-headers
bunx nuxt-feathers-zod middlewares list --target nitro
bunx nuxt-feathers-zod middlewares add request-id --target nitro
```

## CLI command surface in 6.3.8

| Area | Commands |
|---|---|
| Init | `init templates`, `init embedded`, `init remote` |
| Remote auth | `remote auth keycloak` |
| Services | `add service`, `add remote-service`, `auth service`, `schema` |
| Runtime scaffolding | `add middleware`, `add server-module`, `add mongodb-compose`, `mongo management` |
| OSS assets | `templates list`, `plugins list/add`, `modules list/add`, `middlewares list/add` |
| Diagnostics | `doctor` |

## Auth-aware generation for `users`

For the `users` service, `--auth` and `--authAware` are distinct concerns:

- `--auth` protects service methods with JWT hooks
- `--authAware` enables local-auth-aware password handling

When generating `users --auth`, the CLI keeps an **auto-safe default** and enables auth-aware behavior unless it is explicitly disabled.

Auth-aware generation ensures the generated service handles password concerns consistently across `schema=none|zod|json` and `adapter=memory|mongodb`:

- hashes `password` with `passwordHash({ strategy: 'local' })`
- strips `password` from returned records/results
- persists the `authAware` state in the service manifest

Examples:

```bash
bunx nuxt-feathers-zod add service users --auth --schema none --adapter memory --force
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id --force
bunx nuxt-feathers-zod add service users --auth --authAware false --schema json --adapter memory --force
```

## Optional MongoDB management surface

The OSS core can expose an optional MongoDB management layer from the generated `feathers/server/mongodb.ts` template, backed by `feathers-mongodb-management-ts`.

Example:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: true,
          auth: true,
          basePath: '/mongo',
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeCollectionCrud: true,
        },
      },
    },
  },
})
```

This adds a controlled, opt-in management layer for:

- `/mongo/databases` (legacy alias accepted: `/mongo`)
- `/mongo/<db>/collections`
- `/mongo/<db>/stats`
- `/mongo/<db>/<collection>/indexes`
- `/mongo/<db>/<collection>/count`
- `/mongo/<db>/<collection>/schema`
- `/mongo/<db>/<collection>/documents`
- `/mongo/<db>/<collection>/aggregate`

`doctor` reports Mongo management settings with a normalized `basePath`, a computed route surface and a warning when management is enabled without `database.mongo.url`.

## Protecting an existing service after generation

```bash
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod auth service users --enabled false
```

## Generating a local MongoDB Docker Compose file

```bash
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod add mongodb-compose --out docker-compose-db.yaml --database app --rootPassword secret --force
```

## Notes

- Recommended convention: `servicesDirs: ['services']`
- Recommended path: **CLI-first**
- In remote mode, `transport: auto` resolves to **socketio** in the current OSS runtime
- Historical aliases may remain supported for backward compatibility, but the public docs foreground canonical commands only
- Maintainer-only publication and admin procedures are kept in `README_private.md` and intentionally excluded from the public repository surface

## License

MIT
