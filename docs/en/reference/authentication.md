---
editLink: false
---
# Authentication

The open source core covers three main scenarios:

- embedded local/JWT auth,
- remote JWT auth,
- Keycloak SSO bridge.

## Embedded

When `feathers.auth = true` in embedded mode:

- the local Feathers server exposes `authentication`,
- a local `users` service is usually required,
- the CLI is the recommended way to generate that service.

Example:

```bash
bunx nuxt-feathers-zod init embedded --force --auth
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

## Remote

In remote mode, config lives under `feathers.client.remote.auth`.

Example:

```ts
remote: {
  auth: {
    enabled: true,
    payloadMode: 'jwt',
    strategy: 'jwt',
    tokenField: 'accessToken',
    servicePath: 'authentication',
    reauth: true,
  }
}
```

## Keycloak

The module supports a Keycloak → Feathers bridge:

```ts
await client.service('authentication').create({
  strategy: 'jwt',
  access_token: keycloak.token
})
```
