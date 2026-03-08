# Options

Public `feathers` API in `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: { path: '/socket.io' }
    },
    servicesDirs: ['services'],
    server: {
      enabled: true,
      pluginDirs: ['server/feathers'],
      moduleDirs: ['server/feathers/modules'],
      secureDefaults: true
    },
    auth: false,
    swagger: false,
    templates: { enabled: false, dirs: [] }
  }
})
```

## Main blocks

### `client`

- `mode`: `embedded | remote`
- `remote`: external backend config
- `pinia`: feathers-pinia integration

### `transports`

- `rest.path`
- `rest.framework`: `express | koa`
- `websocket.path`

### `servicesDirs`

Scanned directories for embedded services.

Recommended convention:

```ts
servicesDirs: ['services']
```

### `server`

- `enabled`
- `pluginDirs`
- `plugins`
- `moduleDirs`
- `modules`
- `secureDefaults`
- `secure`

### `auth`

- `false`
- `true`

In embedded mode, `auth: true` usually implies a local `users` service generated through the CLI.

### `swagger`

- `false`
- `true`

### `templates`

- `enabled`
- `dirs`
- `strict`
- `allow`

## Remote example

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '/api/v1',
        websocketPath: '/socket.io',
        services: [{ path: 'users', methods: ['find', 'get'] }],
        auth: {
          enabled: true,
          payloadMode: 'jwt',
          strategy: 'jwt',
          tokenField: 'accessToken',
          servicePath: 'authentication',
          reauth: true
        }
      }
    }
  }
})
```
