# Embedded and remote modes

The client can run in two modes. The choice determines where the Feathers application lives and how Nuxt connects to it.

## Embedded

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

Feathers starts inside Nitro. The module prepares infrastructure, runs modules and plugins, registers services, calls `app.setup()`, creates REST and Socket.IO routers, then marks the `default` runtime as ready.

Use embedded mode for a full-stack Nuxt application or a single deployable Nuxt/Nitro service.

## Remote

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.test',
        transport: 'socketio',
        services: [
          { path: 'users' },
          { path: 'articles', methods: ['find', 'get'] },
        ],
      },
    },
  },
})
```

Nuxt connects to an existing Feathers server through REST or Socket.IO.

## Stable client contract

```ts
const service = useService('articles')
const rows = await service.find({ query: { $limit: 25 } })
```

The business contract remains a Feathers service in both modes.

<!-- release-version: 6.5.47 -->
