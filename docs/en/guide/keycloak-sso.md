---
editLink: false
---
# Keycloak SSO

This flow makes **Keycloak the browser-side identity source**, then materializes a Feathers session through the `authentication` service.

## Example: new Nuxt 4 app + remote + Keycloak

```bash
bunx nuxi@latest init my-nfz-keycloak
cd my-nfz-keycloak
bun install
bun add nuxt-feathers-zod feathers-pinia keycloak-js
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --auth true --payloadMode keycloak --force
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm myrealm --clientId myapp
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bun dev
```

## Required file

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

## Typical configuration

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true
        }
      }
    },
    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'myrealm',
      clientId: 'myapp',
      onLoad: 'check-sso'
    },
    auth: true
  }
})
```

## Full Nuxt 4 remote example

For a full example with:

- CLI-generated `auth-keycloak` middleware
- protected `/private` route
- remote Feathers service call with `useService('messages')`

see:

- [Complete example: Nuxt 4 app in remote mode + Keycloak + remote service](./remote-keycloak-app)

## Payload sent to Feathers

```ts
await client.service('authentication').create({
  strategy: 'jwt',
  access_token: keycloak.token
})
```

## Stabilization tips

- keep `tokenField` explicit
- document Redirect URIs and Web Origins in Keycloak
- test with remote REST first to isolate SSO issues


## Runtime helper recommended pattern

```ts
const auth = useAuthRuntime()
await auth.ensureReady()

const request = useAuthenticatedRequest()
const data = await request('/api/private')
```

This avoids rebuilding a Bearer header manually and keeps Keycloak + Feathers aligned through the unified auth runtime.
