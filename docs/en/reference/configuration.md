# Configuration

The module configuration lives under the `feathers` key in `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

## Main options

| Option | Purpose |
|---|---|
| `client` | Client mode, transport and connection behavior. |
| `server` | Embedded server activation and options. |
| `servicesDirs` | Directories scanned for services. |
| `transports` | REST and Socket.io. |
| `auth` | Local/JWT authentication. |
| `keycloak` | Client-side Keycloak and bridge settings. |
| `database` | MongoDB configuration and management options. |
| `validator` | Validator used by schemas. |
| `swagger` | Legacy Swagger documentation. |
| `console` | Embedded console/builder when available. |
| `devtools` | DevTools integration when available. |

## Runtime config

The module writes private and public configuration under `_feathers`.

- `runtimeConfig._feathers`: private server values;
- `runtimeConfig.public._feathers`: values available on the client.

Secrets must stay in private configuration or server-side environment variables.

## Embedded MongoDB example

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: {
      rest: { enabled: true, path: '/feathers' },
      websocket: { enabled: true },
    },
    database: {
      mongodb: {
        enabled: true,
        url: process.env.MONGO_URL,
      },
    },
  },
})
```

## Remote example

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      url: 'https://api.example.com',
      transport: 'socketio',
    },
    auth: {
      enabled: true,
    },
  },
})
```

## Best practice

Centralize environment values in `.env` files and never duplicate secrets in source code.
