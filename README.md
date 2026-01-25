# nuxt-feathers-zod

Nuxt 4 module that embeds a **FeathersJS v5 (Dove)** server into **Nitro** and generates a **typed Feathers client** for your Nuxt app, with **Zod-first validation**.
It's using and inspired from project **[https://github.com/GaborTorma/feathers-nitro-adapter.git]()**

This repository ships a ready-to-run playground (`nuxi dev playground`) and a module you can install in your own Nuxt application.

## Features

- FeathersJS v5 server running inside Nitro (no separate server process required)
- REST transport (Koa or Express) and optional Socket.io (websocket)
- Zod schemas for data + query validation (server-side)
- Optional client integration with Pinia stores (via `feathers-pinia`)
- Generated types for services (`ServiceTypes`) and shared client service registrations (`*.shared.ts`)

## Requirements

- Node.js 18+ (or Bun)
- Nuxt 4

## Install

In your Nuxt application:

```bash
# Bun
bun add nuxt-feathers-zod feathers-pinia

# npm
npm i nuxt-feathers-zod feathers-pinia
```

Then enable the module:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
})
```

## Minimal configuration

Below is a minimal configuration that:

- exposes Feathers REST under `/feathers` (default)
- enables websocket (`/socket.io`)
- enables authentication (local + jwt)

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    servicesDirs: ['services'],
    transports: {
      rest: { path: '/feathers', framework: 'koa' },
      websocket: { path: '/socket.io' },
    },
    database: {
      mongo: {
        url: process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/nuxt-feathers-zod',
      },
    },
    client: {
      pinia: {
        // where Pinia stores will be generated/loaded from (if you use them)
        storesDirs: ['stores'],
        // default id field for services
        idField: 'id',
        // per-service overrides
        services: {
          mongos: { idField: '_id' },
        },
      },
    },
    auth: {
      entity: 'user',
      service: 'users',
      authStrategies: ['local', 'jwt'],
      local: { usernameField: 'userId', passwordField: 'password' },
      // IMPORTANT: always set in production via env
      secret: process.env.AUTH_SECRET || 'dev-secret-change-me',
    },
  },
})
```

## Transport examples

### REST with Koa (default)

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    transports: { rest: { framework: 'koa' } },
  },
})
```

### REST with Express

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    transports: { rest: { framework: 'express' } },
  },
})
```

If you use Express REST, ensure your project includes the Express transport dependencies (Feathers server side):

```bash
bun add @feathersjs/express express
```

### WebSocket with Socket.io

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    transports: {
      websocket: { path: '/socket.io', connectTimeout: 45_000 },
    },
  },
})
```

When both REST and websocket are enabled, the generated client typically uses REST on SSR and websocket in the browser.

## Service structure

Services live in `services/**` and follow this convention:

- `services/<name>/<name>.class.ts` – Feathers service class (MongoDB, memory, custom, ...)
- `services/<name>/<name>.schema.ts` – Zod schemas + Feathers resolvers
- `services/<name>/<name>.ts` – service registration + hooks
- `services/<name>/<name>.shared.ts` – client registration (used by generator)

## Using the generated client in your app

The module injects a typed Feathers client as `nuxtApp.$api`.

```ts
// example: in a component or composable
const { $api } = useNuxtApp()

// typed service access (if you generated types)
const users = $api.service('users')
const list = await users.find({ query: {} })
```

## Authentication: testing with curl

Create a user:

```bash
curl -i -X POST "http://localhost:3000/feathers/users" \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

Authenticate:

```bash
curl -i -X POST "http://localhost:3000/feathers/authentication" \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

Use the JWT to call a protected endpoint:

```bash
curl -i "http://localhost:3000/feathers/users" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Playground

Run the playground:

```bash
bun install
bun run dev
```

Open:

- Nuxt app: `http://localhost:3000/`
- Feathers REST: `http://localhost:3000/feathers/*`

### End-to-end smoke test (REST + auth)

Once the dev server is up, run the following commands in a terminal.

Create a user:

```bash
curl -i -X POST "http://localhost:3000/feathers/users" \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

Authenticate (local strategy):

```bash
curl -i -X POST "http://localhost:3000/feathers/authentication" \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

Copy the `accessToken` from the JSON response, then call a protected route:

```bash
curl -i "http://localhost:3000/feathers/users" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Expected:

- `POST /feathers/users` returns `201`
- `POST /feathers/authentication` returns `201` and an `accessToken`
- `GET /feathers/users` returns `200` when `Authorization: Bearer ...` is provided

### WebSocket smoke test (Socket.io)

If you enabled `transports.websocket`, you can test websocket connectivity with a tiny script.

```bash
# from the repo root
bun -e "
import { io } from 'socket.io-client'
const socket = io('http://localhost:3000', { path: '/socket.io', transports: ['websocket'] })
socket.on('connect', async () => {
  console.log('connected', socket.id)
  socket.disconnect()
  process.exit(0)
})
socket.on('connect_error', (e) => {
  console.error('connect_error', e?.message || e)
  process.exit(1)
})
"
```

If you want to test authenticated websocket calls, use `@feathersjs/socketio-client` in a small script (see `playground/` for a browser-first example).

## Publishing to npm

This repository is a Nuxt module. The published package should only contain the compiled output (see `files: ["dist"]` in `package.json`).

Recommended flow:

```bash
# 1) install
bun install

# 2) run unit + type tests
bun run test:types
bun run test

# 3) build the module (produces ./dist)
bun run prepare

# 4) publish (from the repo root)
npm publish --access public
```

Notes:

- Keep Feathers packages aligned (single version across the workspace). This repo uses `overrides` for that purpose.
- Do not publish `playground/` build artifacts (`playground/.nuxt`, `playground/node_modules`).

## Notes about SSR and Pinia auth bootstrap

The runtime auth bootstrap (`src/runtime/plugins/feathers-auth.ts`) re-authenticates **client-side only** to avoid SSR startup failures when the Feathers client is not yet injected.


C’est appliqué au dépôt (zip monté), en respectant exactement l’ordre que vous avez demandé.

Voici ce qui a été ajouté / modifié dans **nuxt-feathers-zod-main** :

## 1) CLI Bun: `bunx nuxt-feathers-zod …`

### Ajouts

* `bin/nuxt-feathers-zod` (exécutable, shebang Bun)
* `src/cli/index.ts` (implémentation complète de la CLI)

### package.json

* Ajout de :

  * `"bin": { "nuxt-feathers-zod": "bin/nuxt-feathers-zod" }`
  * `"files": ["dist", "bin", "src/cli"]` pour que la CLI soit bien publiée
  * `"test": "vitest run"` (smoke tests)

## 2) Commande `add service` (4 fichiers) + smoke tests

### Commande

```bash
bunx nuxt-feathers-zod add service <serviceName> [--adapter mongodb|memory] [--auth] [--servicesDir <dir>] [--dry] [--force]
```

### Génération

Crée automatiquement :

* `services/<name>/<name>.schema.ts`
* `services/<name>/<name>.class.ts`
* `services/<name>/<name>.shared.ts`
* `services/<name>/<name>.ts`

Aligné sur le style déjà présent dans le repo :

* Zod + `getZodValidator(...)`
* `zodQuerySyntax(schema)`
* `schemaHooks.validateQuery/validateData + resolveQuery/resolveData`
* `--auth` ajoute `authenticate('jwt')` sur `find/get/patch/remove` (create reste ouvert)

`--adapter mongodb` génère un `_id` ObjectId (regex 24 hex) comme le service `mongos` existant.
`--adapter memory` génère un `id: z.number().int()` comme `messages`.

Smoke test ajouté : `test/cli.spec.ts` (vérifie service + middleware).

## 3) Commande `add middleware` (Nitro)

### Commande

```bash
bunx nuxt-feathers-zod add middleware <name> [--target nitro|feathers] [--dry] [--force]
```

Par défaut (`--target nitro`) :

* crée `server/middleware/<name>.ts` avec un template `defineEventHandler(...)`.

## 4) `--target feathers` (plugin Feathers côté serveur)

Si vous faites :

```bash
bunx nuxt-feathers-zod add middleware dummy --target feathers
```

Génère :

* `server/feathers/dummy.ts`

Template basé sur le pattern existant `playground/server/feathers/dummy.ts` :

* `defineFeathersServerPlugin((app) => app.hooks({ setup: [...] }))`

## 5) Options ajoutées

* `--adapter mongodb|memory`
* `--auth`
* `--dry`
* `--force`
* `--servicesDir <dir>`
* `--target nitro|feathers`


## Changements du 25 janvier 2026

### 1) `add service` : nouvelles options ROI

La commande supporte désormais :

```bash
bunx nuxt-feathers-zod add service <serviceName> \
  [--idField id|_id] \
  [--path <customPath>] \
  [--docs] \
  [--adapter mongodb|memory] \
  [--auth] \
  [--servicesDir <dir>] \
  [--dry] \
  [--force]
```

#### `--idField id|_id`

* Détermine le champ d’identifiant dans le schéma Zod généré.
* Compatible avec `mongodb` (ObjectId en string 24 hex) et `memory` (number int).
* Défauts :

  * `mongodb` → `_id`
  * `memory` → `id`

#### `--path <customPath>`

* Découple le **dossier service** du **path Feathers exposé**.
* Normalise automatiquement les `/` de tête/fin (ex: `/accounts/` → `accounts`).
* Impacte : `*.shared.ts` (path const), et donc tous les usages de `service(path)`.

#### `--docs`

* Injecte un bloc `docs:` (Swagger legacy) dans le `app.use(...)`.
* Ajoute `securities: ['jwt']` si `--auth` est activé.

### 2) Tests smoke mis à jour

* Ajout d’un test couvrant `--path`, `--idField`, `--docs`.

---

## Exemple rapide (valide)

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --auth --idField id --path accounts --docs
```

Génère `services/users/*` mais expose le service sur `accounts` avec schéma `id: objectIdSchema()` + bloc `docs:`.



## License

MIT
