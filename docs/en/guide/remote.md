---
editLink: false
---
# Remote mode

Remote mode configures **only the Feathers client** to point to an external server.

## Use cases

- existing production Feathers backend
- separate Nuxt frontend
- external API proxy
- Keycloak bridge to a remote backend

## Example: new Nuxt 4 remote app

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Target configuration example

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'http://localhost:3030',
        transport: 'socketio',
        restPath: '/feathers',
        websocketPath: '/socket.io',
        services: [
          { path: 'users', methods: ['find', 'get', 'create', 'patch', 'remove'] },
          { path: 'messages', methods: ['find', 'get'] }
        ]
      }
    }
  }
})
```

## Remote REST

```bash
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport rest --restPath / --force
```

## Remote Socket.IO

```bash
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport socketio --websocketPath /socket.io --force
```

## `transport: 'auto'` behavior

- **embedded browser**: `auto` prefers `rest`
- **remote**: `auto` prefers `socketio` when available, otherwise `rest`

In remote mode, `auto` (or an omitted value) currently resolves to **Socket.IO**.

```bash
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport auto --force
```

For first-pass network or CORS diagnostics, prefer `--transport rest` so you can validate the effective URL and raw HTTP response more directly.

## Remote auth

When the remote API expects a standard JWT payload:

```bash
bunx nuxt-feathers-zod init remote \
  --url http://localhost:3030 \
  --transport rest \
  --auth true \
  --payloadMode jwt \
  --strategy jwt \
  --tokenField accessToken \
  --servicePath authentication \
  --force
```

When the API expects a Keycloak-derived token:

```bash
bunx nuxt-feathers-zod init remote \
  --url http://localhost:3030 \
  --transport rest \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

## Calling a remote service

```ts
const users = useService('users')
const result = await users.find({ query: { $limit: 10 } })
```

## Full Nuxt 4 + Keycloak example

For a ready-to-run example with the `auth-keycloak` route middleware and a call to a remote service, see:

- [Complete example: Nuxt 4 app in remote mode + Keycloak + remote service](./remote-keycloak-app)

## Stabilization tips

- declare services explicitly in `client.remote.services`
- start with REST for network diagnostics
- use Socket.IO once the remote backend is already validated
- keep `remote.auth` minimal and explicit

> Transport note (6.4.129): in generated clients, `transport: 'auto'` now resolves deterministically. Embedded browser mode prefers REST first; remote mode prefers Socket.IO when available, then falls back to REST.
