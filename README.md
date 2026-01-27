# nuxt-feathers-zod

Nuxt 4 module that embeds a **FeathersJS v5 (Dove)** server directly into **Nitro** and exposes Feathers services to your Nuxt application, with **Zod-first validation** and an optional **Swagger (legacy) integration**.

This module lets you run Feathers **without a separate backend process**, while keeping strong typing, shared schemas, and a clean DX.

---

## ✨ Features

- FeathersJS v5 (Dove) running **inside Nitro**
- REST transport (Koa or Express)
- Optional Socket.io transport (WebSocket)
- **Zod schemas** for data + query validation (server-side)
- Typed Feathers client injected into Nuxt (`$api`)
- Optional Pinia integration via `feathers-pinia`
- CLI to generate services and middleware
- **Swagger UI (legacy)** support via `feathers-swagger`

---

## 📦 Requirements

- Node.js **18+** (or **Bun** recommended)
- Nuxt **4**
- FeathersJS **v5 (Dove)**

---

## 🚀 Using nuxt-feathers-zod in a new Nuxt 4 project (step by step)

This section explains **from zero** how to use `nuxt-feathers-zod` in a fresh Nuxt 4 project.

---

## 1️⃣ Create a new Nuxt 4 project

```bash
bunx nuxi@latest init my-nuxt-feathers-app
cd my-nuxt-feathers-app
bun install
```

Run once to verify:

```bash
bun run dev
```

---

## 2️⃣ Install nuxt-feathers-zod

```bash
bun add nuxt-feathers-zod feathers-pinia
```

(Optional – for Swagger legacy support)

```bash
bun add feathers-swagger
```

---

## 3️⃣ Enable the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
})
```

At this point, Nuxt will start with an **embedded FeathersJS server inside Nitro**.

---

## 4️⃣ Minimal Feathers configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],

    transports: {
      rest: {
        path: '/feathers',
        framework: 'koa',
      },
    },

    database: {
      mongo: {
        url: 'mongodb://127.0.0.1:27017/nuxt-feathers-zod',
      },
    },
  },
})
```

Start Nuxt:

```bash
bun run dev
```

Test:

```bash
curl http://localhost:3000/feathers
```

---

## 5️⃣ Generate your first service

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

This generates:

```
services/articles/
├─ articles.class.ts
├─ articles.schema.ts
├─ articles.ts
└─ articles.shared.ts
```

---

## 6️⃣ Example: Articles service (server)

```ts
// services/articles/articles.ts
export function articles(app: Application) {
  app.use('articles', new ArticlesService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    docs: {
      description: 'Articles API',
      idType: 'string',
    },
  })
}
```

---

## 7️⃣ Use the service in Nuxt (client)

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

const articles = await $api.service('articles').find()
</script>

<template>
  <pre>{{ articles }}</pre>
</template>
```

---

## 8️⃣ Authentication example

Create a user:

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

Authenticate:

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

Use JWT:

```bash
curl http://localhost:3000/feathers/articles \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 9️⃣ Swagger (legacy) – complete example

Enable Swagger:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  feathers: {
    swagger: true,
  },
})
```

Access:

- UI: http://localhost:3000/feathers/docs/
- Spec: http://localhost:3000/feathers/swagger.json

⚠️ In Swagger UI, **replace `/swagger.json` with `../swagger.json`**.

---

## 🔟 Project layout recap

```
my-nuxt-feathers-app/
├─ app/
├─ server/
├─ services/
│  └─ articles/
├─ nuxt.config.ts
└─ package.json
```

---

## 🧠 Credits

Inspired by:

- https://github.com/GaborTorma/feathers-nitro-adapter
- FeathersJS v5 (Dove)

---

## ✅ Status

**Stable – reference version frozen**
