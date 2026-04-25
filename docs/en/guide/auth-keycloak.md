---
editLink: false
---
# Keycloak SSO (Keycloak-only)

This guide describes the **Keycloak-only** mode in `nuxt-feathers-zod`: the Nuxt application uses Keycloak as the identity provider, without a local Feathers login form.

> Important: do not use an `auth` block containing `provider: 'keycloak'` as the main configuration. `provider` is not a strict option of the `auth` block. NFZ detects Keycloak through `feathers.keycloak` and/or `feathers.client.remote.auth.payloadMode = 'keycloak'`.

## Goals

- Keep the public application available without a global login.
- Protect selected routes only, for example `/console/**`.
- Use the Keycloak token as a Bearer token for protected HTTP calls.
- Let `useAuthRuntime()` synchronize the authentication state on the client.

## Variant A — Keycloak-only with embedded bridge

Use this variant when the Nuxt application embeds NFZ and exposes a local Keycloak bridge, by default `/_keycloak`.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    // Disable generated local Feathers authentication.
    // Keycloak becomes the browser-side identity source.
    auth: false,

    keycloak: {
      serverUrl: 'https://keycloak.example.com',
      realm: 'MYREALM',
      clientId: 'my-nuxt-app',

      // NFZ bridge used by useKeycloakBridge().
      authServicePath: '/_keycloak',

      // Optional: resolve/create the application user.
      userService: 'users',
      serviceIdField: 'keycloakId',

      permissions: false,
      onLoad: 'check-sso',
    },
  },
})
```

In this mode, the `keycloak-sso` client plugin initializes `keycloak-js`, then `useKeycloakBridge()` synchronizes the Keycloak session into `useAuthRuntime()`.

## Variant B — Remote Nuxt + Feathers API protected by Keycloak

Use this variant when Nuxt consumes a remote Feathers API. The NFZ client uses the Keycloak token to authenticate against the remote authentication service.

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

        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true,
          storageKey: 'feathers-jwt',
        },
      },
    },

    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'MYREALM',
      clientId: 'my-nuxt-app',
      onLoad: 'check-sso',
    },
  },
})
```

With `payloadMode: 'keycloak'`, the backend receives `access_token` and compatibility aliases such as `accessToken`, `token`, and `jwt`.

## Required silent SSO file

Create `public/silent-check-sso.html`:

```html
<!doctype html>
<html>
  <body>
    <script>
      parent.postMessage(location.href, location.origin)
    </script>
  </body>
</html>
```

In Keycloak, allow:

- Redirect URIs: `https://your-site/*` and `https://your-site/silent-check-sso.html`
- Web origins: `https://your-site`

## onLoad

- `check-sso`: attempts silent SSO without forcing a global login.
- `login-required`: forces a Keycloak login before using the app.

For an admin console or dashboard, prefer `check-sso` with a targeted route middleware.

## Generate the Nuxt middleware

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```

The generator creates:

```txt
app/middleware/auth-keycloak.ts
public/silent-check-sso.html
```

Simplified example to protect `/console/**` only:

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  if (!to.path.startsWith('/console'))
    return

  const { $keycloak } = useNuxtApp()

  if (!$keycloak?.authenticated) {
    await $keycloak.login({
      redirectUri: window.location.origin + to.fullPath,
    })
  }
})
```

## Application usage

For critical pages, avoid calling `$api.service(...)` directly before auth is ready. Use the NFZ runtime layer:

```ts
const auth = useAuthRuntime()
await auth.ensureReady()
```

For protected HTTP calls:

```ts
const request = useAuthenticatedRequest()

const result = await request('/feathers/users', {
  auth: 'required',
})
```

For protected pages:

```ts
const page = useProtectedPage({
  auth: 'required',
  validateBearer: true,
  reason: 'admin-console',
})

onMounted(async () => {
  await page.ensure()
})
```

## Complete Nuxt 4 remote example

For a complete example with:

- generated `auth-keycloak` middleware
- protected `/private` route
- remote Feathers service call

see:

- [Complete example: Nuxt 4 remote app + Keycloak + remote service](./remote-keycloak-app)

## Flow summary

```txt
Browser Keycloak
  ↓
keycloak-sso plugin
  ↓
useKeycloakBridge()
  ↓
useAuthRuntime()
  ↓
useAuthenticatedRequest() / useAuthBoundFetch()
  ↓
Protected Feathers API
```
