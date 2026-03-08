---
editLink: false
---
# Modes: embedded, remote, hybrid

`nuxt-feathers-zod` supports two main client-side modes, plus a common hybrid case with Keycloak.

## 1) Embedded

The Feathers server runs **inside the same Nuxt 4 app**.

### When to choose embedded

- Nuxt + API monolith
- fast start
- simple deployment stack
- need to generate services + auth in one repo

### New Nuxt 4 app example

```bash
bunx nuxi@latest init my-nfz-embedded
cd my-nfz-embedded
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --framework express --force
bunx nuxt-feathers-zod add service messages
bun dev
```

### Expected result

- embedded server enabled
- local REST transport enabled
- local Socket.IO transport enabled
- Nuxt client connected to that local server

## 2) Remote

Nuxt does not start any Feathers server. It configures a **client** to an external Feathers API.

### When to choose remote

- existing Feathers backend
- separate frontend/backend
- microservices
- shared remote API

### New Nuxt 4 app example

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

## 3) Hybrid case: remote + Keycloak SSO

Common case:

- Keycloak manages browser identity
- Feathers manages the application session on the API side

The browser gets a Keycloak token, then the module calls `authentication.create(...)` to materialize a Feathers session.

### Example

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport rest \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

## Which strategy should you pick?

### Embedded

Choose embedded if you want:

- the easiest way to start,
- quick validation of generated services,
- Nuxt + Feathers + auth in a single project.

### Remote

Choose remote if you want:

- clear frontend/backend separation,
- connect Nuxt to an existing backend,
- avoid embedding the Feathers server in Nitro.

## Invariants worth keeping stable

Recommended open source core invariants:

- `servicesDirs: ['services']`
- embedded = Feathers server inside Nitro
- remote = no local embedded server
- `init embedded` and `init remote` are the official entry points
- `runtimeConfig.public._feathers` should reflect the real mode cleanly
