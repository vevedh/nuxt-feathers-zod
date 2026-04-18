---
editLink: false
---
# Getting started

`nuxt-feathers-zod` embeds **FeathersJS v5 (Dove)** into **Nuxt 4 / Nitro** and already provides an advanced foundation to build either:

- an **embedded** Feathers API inside your Nuxt app,
- a Nuxt frontend connected to a **remote** Feathers API,
- or a hybrid setup with **local auth, JWT and Keycloak SSO**.

The module is designed to be **CLI-first**: the supported way to bootstrap and generate artifacts is `bunx nuxt-feathers-zod ...`.

## 5-command quickstart

If you only want the shortest supported path, do this first:

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


## Quickstart upload/download local

```bash
bunx nuxi@latest init my-nfz-files
cd my-nfz-files
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
bun dev
```

## What the module already supports

The current stable base already covers:

- **embedded mode**: Feathers runs inside Nitro,
- **remote mode**: Feathers client against an external API,
- **REST** and **Socket.IO**,
- embedded server with **Express** or **Koa**, 
- CLI generation of **standard services**,
- CLI generation of **adapter-less services** with **custom methods**,
- registration of **remote services** on the client side,
- **local/JWT** auth,
- **Keycloak SSO** auth flows,
- **feathers-pinia** support on the client,
- optional **legacy Swagger** support,
- **template overrides** for generated templates,
- embedded **server modules** (CORS, helmet, compression, body-parser, serve-static, rate-limit, healthcheck),
- Express **server-module presets** through the CLI,
- local **MongoDB bootstrap** through `add mongodb-compose`,
- **auth hook enable/disable** on an existing service through `auth service`,
- optional **MongoDB management** through `database.mongo.management`,
- a playground used to validate embedded / remote scenarios.

## Prerequisites

- **Bun** recommended
- **Node.js 18+**
- **Nuxt 4**

## Recommended approach

Two rules matter the most:

1. **Do not create your first services manually**.
2. **Initialize the module first, then generate services through the CLI**.

That is the safest path to avoid scan issues, missing exports, auth entity mismatches, template drift or inconsistent hooks.

---

## Recommended path #1: start in embedded mode

This is the best entry point to discover the module.

### 1) Create a Nuxt 4 app

```bash
bunx nuxi@latest init my-app
cd my-app
bun install
```

### 2) Install the module

```bash
bun add nuxt-feathers-zod feathers-pinia
```

Optional, if you want legacy Swagger docs:

```bash
bun add feathers-swagger swagger-ui-dist
```

If your app uses Pinia, also add:

```bash
bun add -D @pinia/nuxt
```

Then enable `@pinia/nuxt` in `modules` if your app does not already do it.

### 3) Initialize embedded mode

```bash
bunx nuxt-feathers-zod init embedded --force
```

This command prepares a minimally coherent setup to:

- register `nuxt-feathers-zod` in `modules`,
- configure `feathers.servicesDirs`,
- enable an embedded Feathers server,
- prepare REST and WebSocket transport,
- patch `nuxt.config.ts` when the file keeps the expected standard shape.

### 4) Generate your first service

```bash
bunx nuxt-feathers-zod add service users
```

You can also generate a MongoDB-backed service directly:

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id
```

### 5) Start the app

```bash
bun run dev
```

### 6) Quick test

Typical endpoints:

- `GET http://localhost:3000/feathers/users`
- `POST http://localhost:3000/feathers/users`

---

## Recommended path #2: embedded mode with local auth

If you want a more realistic application baseline with local authentication:

### 1) Initialize embedded + auth

```bash
bunx nuxt-feathers-zod init embedded --force --auth
```

### 2) Generate the `users` service

```bash
bunx nuxt-feathers-zod add service users --auth
```

For MongoDB:

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id --auth --docs
```

### 3) Start Nuxt

```bash
bun run dev
```

Depending on your configuration, auth endpoints are exposed under the REST prefix, by default:

- `POST /feathers/authentication`
- `GET /feathers/users`

> In local-auth mode, generating the `users` service through the CLI is not just convenient: it is the recommended path to keep auth entity resolution and generated files consistent.

---

## Recommended path #3: Nuxt frontend against a remote Feathers API

Remote mode allows you to use the module as a coherent Feathers client layer without embedding the Feathers server into Nitro.

### 1) Initialize remote mode

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio
```

REST example:

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest
```

### 2) Register the remote services you need

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bunx nuxt-feathers-zod add remote-service articles --path articles --methods find,get
```

### 3) Start Nuxt

```bash
bun run dev
```

The client runtime then reads the remote configuration exposed through `runtimeConfig.public._feathers`.

---

## File upload/download starter

NFZ also provides a dedicated CLI scaffold for a local file upload/download service:

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

This starter generates an adapter-less service with `find`, `get`, `remove`, `upload` and `download`. Full details are in [File upload/download service](/en/guide/file-upload-download).

## Generate an adapter-less service with custom methods

The module can also generate an **adapter-less service**, useful for:

- business actions,
- job execution,
- controlled endpoints,
- SSR-safe / transport-agnostic facades.

Recommended command:

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

This mode is now the public documented replacement for the older `add custom-service` wording.

---

## Minimal manual configuration example

The CLI is recommended, but this is a coherent baseline if you want to understand the expected structure:

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],

    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: true,
    },

    auth: true,
    swagger: false,

    client: {
      mode: 'embedded',
      pinia: true,
    },
  },
})
```

For MongoDB, add the database configuration that fits your project.

---

## Advanced features already available

Once the base is working, you can progressively enable:

- **template overrides**,
- **legacy Swagger**,
- **Keycloak SSO**,
- embedded **server modules**,
- **Koa** instead of Express,
- additional **remote services**,
- the validation **playground** for embedded/remote scenarios.

Useful next pages:

- [CLI](./cli)
- [Modes](./modes)
- [Services](./services)
- [Adapter-less services](./custom-services)
- [Local auth](./auth-local)
- [Keycloak SSO](./keycloak-sso)
- [Swagger](./swagger)
- [Template overrides](./template-overrides)

---

## What should be treated as the stable open core

To stabilize the module before going further, I recommend treating the following as the **standard core**:

- embedded,
- remote,
- REST,
- Socket.IO,
- Express / Koa,
- `add service`,
- `add service --custom`,
- `add remote-service`,
- local/JWT auth,
- current Keycloak SSO support,
- legacy Swagger,
- template overrides,
- standard server modules,
- Pinia / feathers-pinia support,
- `doctor`, `init embedded`, `init remote`, `init templates`.

---

## Good candidates for future licensed features

To keep a stable open-source core while selling advanced capabilities through **license keys**, the best candidates are:

- a **pro visual console** (builder, init wizard, rich diagnostics),
- advanced **RBAC** with ready-to-use policies,
- complete **business presets** (SaaS, admin, multitenant, back-office),
- enriched **NFZ DevTools**,
- **licensing / billing integrations**,
- secure **remote discovery**,
- full backend/frontend **stack generation**,
- enterprise scaffolds (advanced Keycloak, audit, monitoring, observability),
- premium template packs,
- migration assistants and advanced doctor tooling.

The guiding idea is:

- **stable open source** = runtime, CLI, core generation, basic auth, modes, docs,
- **licensed** = premium productivity, admin UI, automation, business packs, advanced diagnostics, enterprise integrations.
