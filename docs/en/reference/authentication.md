---
editLink: false
---
## 6.4.131 patch

The authentication resolver now preserves explicit `authStrategies` from `nuxt.config.ts` instead of silently reintroducing the default strategies.

> 6.4.133 reference: local auth defaults are restored to `userId/password`, and `entityUsernameField/entityPasswordField` follow the same mapping unless you override them explicitly.

# Authentication

The OSS core covers three main scenarios:

- embedded local/JWT auth
- remote JWT auth
- Keycloak SSO bridge

Since `6.4.92+`, the client runtime also uses a unified auth source of truth through `useAuthRuntime()`.

## Embedded

When `feathers.auth = true` in embedded mode:

- the local Feathers server exposes `authentication`
- a local `users` service is usually required
- the CLI is the recommended way to scaffold it

Example:

```bash
bunx nuxt-feathers-zod init embedded --force --auth
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.


## Local fields exposed on the public runtime side

In embedded auth, the public config now also exposes the resolved local fields:

- `runtimeConfig.public._feathers.auth.local.usernameField`
- `runtimeConfig.public._feathers.auth.local.passwordField`
- `runtimeConfig.public._feathers.auth.local.entityUsernameField`
- `runtimeConfig.public._feathers.auth.local.entityPasswordField`

The NFZ default remains `userId/password`.

Since `6.4.123`, this configuration is not only exposed on the public runtime side: it is also injected into the Feathers server through `app.set('authentication', config)` before `new AuthenticationService(app, 'authentication')`, matching the official Feathers API.

## Remote

In remote mode, the config lives under `feathers.client.remote.auth`.

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

The module supports a Keycloak -> Feathers bridge:

```ts
await client.service('authentication').create({
  strategy: 'jwt',
  access_token: keycloak.token
})
```

The bridge also normalizes several useful aliases:

- `access_token`
- `accessToken`
- `jwt`
- `token`
- `bearer`
- `user` / `keycloakUser` / `tokenParsed`

## Runtime recommendation

For protected pages or tools:

- wait for `auth.ensureReady()`
- use `useAuthenticatedRequest()` for protected HTTP routes
- use `useProtectedService()` for protected Feathers services

