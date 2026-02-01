---
editLink: false
---
# Getting started

`nuxt-feathers-zod` embeds **FeathersJS v5 (Dove)** into **Nuxt 4 / Nitro**. You get a REST (and optional WebSocket) API in the *same* Nuxt project, with **Zod-first** service generation.

## Prerequisites

- **Bun** (recommended)
- Node.js >= 18
- Nuxt 4

## 1) Install the module

```bash
bun add nuxt-feathers-zod feathers-pinia
```

Swagger (legacy) is optional:

```bash
bun add feathers-swagger swagger-ui-dist
```

## 2) Configure Nuxt

In `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    // IMPORTANT: directory scanned by the module (CLI outputs go here)
    servicesDirs: ['services'],

    // REST prefix
    rest: { path: '/feathers' },

    // Optional
    // swagger: true,
    // socketio: { path: '/socket.io' }
  }
})
```

## 3) Generate your first service (recommended)

Do **not** create your first service manually. Use the official CLI so that the module can properly export types and register files:

```bash
bunx nuxt-feathers-zod add service users
```

Then start Nuxt:

```bash
bun run dev
```

Test endpoints:

- `POST /feathers/users`
- `POST /feathers/authentication`
- `GET /feathers/users` (requires `Authorization: Bearer <token>`)

## Next steps

- [CLI](./cli)
- [Services](./services)
- [Custom services (no adapter)](./custom-services)
- [Swagger (legacy)](./swagger)
