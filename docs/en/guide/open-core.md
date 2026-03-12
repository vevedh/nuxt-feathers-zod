---
editLink: false
---
# Open source core

This page defines the **open core scope** to stabilize in `nuxt-feathers-zod`.

The principle is simple:

- keep a **predictable, documented and testable** open source core,
- keep “advanced console / enterprise productivity” layers for a future licensed offer,
- avoid destabilizing the main runtime with moving targets.

## Open source scope to freeze

The standard core already covers the following use cases.

### 1) Nuxt 4 + Feathers v5 integration

- **embedded** mode: Feathers server inside Nitro
- **remote** mode: Feathers client to an external API
- **REST** and **Socket.IO** transports
- embedded server with **Express** or **Koa**

### 2) CLI surface supported in the OSS core

- `init embedded`
- `init remote`
- `init templates`
- `add service`
- `add service --custom`
- `add remote-service`
- `add middleware`
- `add server-module`
- `add mongodb-compose`
- `auth service`
- `doctor`

### 3) Services and client runtime

- CLI-generated services
- `memory` and `mongodb` support
- adapter-less services with custom methods
- `useService()` in the app
- `feathers-pinia` integration
- consistent public runtime config for remote mode

### 4) Supported auth

- local / JWT auth
- remote JWT auth
- **Keycloak SSO** bridge
- CLI auth hook toggle on existing services with `auth service <name>`

### 5) Embedded DX

- secure defaults
- built-in server modules
- Express `server-module` presets
- optional Swagger legacy
- template overrides
- validation playground
- optional MongoDB management via `database.mongo.management`

## OSS core validation rules

A capability belongs to the open source core only if it satisfies these rules:

- documented feature,
- minimal reproducible example,
- tested behavior or smoke validation,
- no dependency on a proprietary console,
- no hard coupling to a SaaS service,
- no Bun/Windows CLI parsing regression.

That last point is now explicitly part of the stability contract. The following command must stay parse-safe and usable:

```bash
bunx nuxt-feathers-zod --help
```

## What can become premium later

Good future license-key candidates:

- advanced visual console
- advanced schema builder / init wizard
- enriched dedicated devtools
- ready-made RBAC/policies packs
- premium diagnostics and advanced diffing
- secure remote discovery / inventory
- enterprise presets
- specialized business generators
- advanced template packs

## Recommended stabilization rules

### Stop breaking the base paths

The priority flows to guarantee are:

1. **New Nuxt 4 app + embedded**
2. **New Nuxt 4 app + embedded + local auth**
3. **New Nuxt 4 app + remote REST**
4. **New Nuxt 4 app + remote Socket.IO**
5. **New Nuxt 4 app + Keycloak SSO**
6. **Bun/Windows parse-safe CLI**

### Standardize the official method

Always prefer:

```bash
bunx nuxt-feathers-zod init ...
bunx nuxt-feathers-zod add service ...
```

and avoid manual creation as long as an official generator exists.

### Document the invariants

Public conventions worth keeping:

- `servicesDirs: ['services']`
- CLI-first
- default adapter = `memory`
- default schema = `none`
- historical aliases supported but not recommended
- consistent public client config in remote mode
- explicit opt-in MongoDB management options

## Proposed open source roadmap

### Level 1 — stability

- CLI smoke tests for `init embedded` and `init remote`
- `bunx nuxt-feathers-zod --help` smoke test
- `playground` build smoke test
- VitePress docs smoke test
- Windows + Linux matrix

### Level 2 — clarity

- “new Nuxt 4 app” examples on every major page
- reference pages aligned with real options
- explicit “known limits” section
- dedicated documentation for MongoDB management and server modules

### Level 3 — maintenance

- clear deprecation policy
- changelog focused on breaking changes / migrations
- versioned examples

## Reference command: new Nuxt 4 embedded app

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

## Reference command: new Nuxt 4 remote app

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
