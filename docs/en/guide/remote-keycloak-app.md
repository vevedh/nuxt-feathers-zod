---
editLink: false
---
# Complete example: Nuxt 4 app in remote mode + Keycloak + remote service

This page shows a **small Nuxt 4 app** using:

- `nuxt-feathers-zod` in **remote** mode
- Keycloak as the browser identity source
- the `auth-keycloak` route middleware
- a call to a **remote Feathers service** through `useService()`

## What this example does

- the app runs in **remote** mode
- Keycloak starts with `check-sso`
- `/private` is protected by `auth-keycloak`
- `/private` calls the remote `messages` service
- the Keycloak Bearer token is forwarded automatically to the remote Feathers backend

## 1) Create the project

```bash
bunx nuxi@latest init my-nfz-remote-keycloak
cd my-nfz-remote-keycloak
bun install
bun add nuxt-feathers-zod feathers-pinia keycloak-js
bun add -D @pinia/nuxt
```

## 2) Initialize remote mode

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport rest \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

## 3) Configure Keycloak

```bash
bunx nuxt-feathers-zod remote auth keycloak \
  --ssoUrl https://sso.example.com \
  --realm myrealm \
  --clientId my-nuxt-app
```

## 4) Generate the route middleware

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```

## 5) Declare a remote service

Here we expose the `messages` service on the Nuxt client side.

```bash
bunx nuxt-feathers-zod add remote-service messages \
  --path messages \
  --methods find,get
```

## 6) `nuxt.config.ts`

Minimal coherent example after the CLI commands:

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
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
        },
        services: [
          {
            path: 'messages',
            methods: ['find', 'get'],
          },
        ],
      },
    },
    auth: true,
    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'myrealm',
      clientId: 'my-nuxt-app',
      onLoad: 'check-sso',
    },
  },
})
```

## 7) `public/silent-check-sso.html`

The `auth-keycloak --target route` generator creates it automatically when needed.

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

## 8) Protected route

Create `app/pages/private.vue`:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth-keycloak'],
})

const messages = useService('messages')

const { data, pending, error, refresh } = await useAsyncData('remote-messages', () => {
  return messages.find({
    query: {
      $limit: 10,
    },
  })
})
</script>

<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold">Private area</h1>
    <p>This page requires Keycloak authentication.</p>

    <button type="button" @click="refresh()">
      Reload
    </button>

    <div v-if="pending">Loading…</div>
    <pre v-else-if="error">{{ error }}</pre>
    <pre v-else>{{ data }}</pre>
  </div>
</template>
```

## 9) Optional public page

Create `app/pages/index.vue`:

```vue
<template>
  <div class="p-6 space-y-4">
    <h1 class="text-2xl font-bold">NFZ remote + Keycloak demo</h1>
    <p>Public page.</p>
    <NuxtLink to="/private">
      Go to protected page
    </NuxtLink>
  </div>
</template>
```

## 10) Runtime flow

1. `/private` triggers the `auth-keycloak` middleware
2. if the user is not authenticated, Keycloak starts the login flow
3. once back, the client SSO plugin has the Keycloak token
4. the NFZ client automatically forwards the Bearer token to the remote Feathers backend
5. `useService('messages').find(...)` calls the remote service with that token

## 11) Remote backend requirements

The remote Feathers backend must:

- expose the `authentication` service
- accept the `jwt` strategy
- accept a payload like:

```ts
{
  strategy: 'jwt',
  access_token: '<keycloak_token>'
}
```

- validate the Keycloak token server-side
- protect the `messages` service with the expected authentication policy

## 12) Socket.IO variant

The same scenario works with Socket.IO if the backend is already validated in that mode:

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport socketio \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

For initial diagnostics, REST is still recommended because it makes it easier to isolate:

- API URL issues
- CORS issues
- HTTP errors
- Keycloak payload mapping issues

## 13) Quick test commands

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add remote-service messages --path messages --methods find,get
bun dev
```

Then open:

```txt
http://localhost:3000/private
```

## 14) Summary

This scenario is the **recommended starting point** when you want:

- a Nuxt 4 app separated from the Feathers backend
- browser-side SSO through Keycloak
- Nuxt route protection
- calls to existing remote Feathers services

See also:

- [Remote mode](./remote)
- [Keycloak SSO](./keycloak-sso)
- [Frontend](./frontend)
- [Middleware](../reference/middleware)
