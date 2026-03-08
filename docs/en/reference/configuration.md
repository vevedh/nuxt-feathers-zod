---
editLink: false
---
# Configuration

Configure the module with the `feathers` key in `nuxt.config.ts`.

## Minimal embedded example

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: { path: '/socket.io' }
    },
    auth: false,
    swagger: false
  }
})
```



## Express secure preset (current Option A)

The current patch stabilizes **embedded + Express** mode. Fine-grained flags live under `feathers.server.secure`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: { path: '/socket.io' }
    },
    server: {
      enabled: true,
      secureDefaults: true,
      secure: {
        cors: true,
        compression: true,
        helmet: true,
        bodyParser: {
          json: true,
          urlencoded: true
        },
        serveStatic: false
      }
    }
  }
})
```

Equivalent CLI:

```bash
bunx nuxt-feathers-zod init embedded   --framework express   --cors true   --compression true   --helmet true   --bodyParserJson true   --bodyParserUrlencoded true
```

## Minimal remote example

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '/feathers',
        websocketPath: '/socket.io'
      }
    }
  }
})
```

## Main option groups

- `feathers.client`
- `feathers.client.remote`
- `feathers.servicesDirs`
- `feathers.transports`
- `feathers.server`
- `feathers.auth`
- `feathers.keycloak`
- `feathers.templates`
