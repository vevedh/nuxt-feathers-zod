---
editLink: false
---
# Integrating NFZ in a real Nuxt 4 + Quasar + Pinia app

This guide explains how to integrate `nuxt-feathers-zod` in a complete business application built with:

- Nuxt 4;
- Vue 3;
- Quasar 2 through `nuxt-quasar-ui`;
- UnoCSS;
- Pinia;
- MongoDB;
- embedded FeathersJS v5;
- local/JWT authentication;
- admin/member RBAC;
- NFZ business services.

For an application with a dashboard, administration, authentication and business services, the recommended starter is:

```bash
git clone https://github.com/vevedh/nfz-quasar-unocss-pinia-starter
```

Treat this starter as the complete integration reference, not just as a small demo.

## When to use this guide

Use this guide when your app looks like this:

```txt
app/
├─ layouts/
│  ├─ marketing.vue
│  ├─ portal.vue
│  └─ admin.vue
├─ pages/
│  ├─ login.vue
│  ├─ admin/
│  └─ members/
├─ stores/
│  └─ studioSession.ts
├─ middleware/
│  ├─ auth.ts
│  ├─ admin-auth.ts
│  └─ member-auth.ts
services/
└─ users/
```

## Minimal install

```bash
bun add nuxt-feathers-zod
bun add @pinia/nuxt pinia
bun add nuxt-quasar-ui quasar @quasar/extras
bun add -D unocss @unocss/nuxt
```

## Recommended Nuxt configuration

```ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-quasar-ui',
    '@unocss/nuxt',
    'nuxt-feathers-zod'
  ],

  quasar: {
    lang: 'fr',
    iconSet: 'material-icons',
    plugins: ['Dialog', 'Loading', 'Notify', 'AppFullscreen'],
    extras: {
      fontIcons: ['material-icons']
    },
    components: {
      autoImport: true
    }
  },

  feathers: {
    client: {
      mode: 'embedded'
    },

    transports: {
      rest: true,
      websocket: false
    },

    server: {
      enabled: true
    },

    auth: {
      enabled: true,
      service: 'users',
      entity: 'user',
      entityId: 'id',
      entityClass: 'User',
      authStrategies: ['jwt', 'local'],
      jwtOptions: {
        header: { typ: 'access' },
        audience: 'https://your-app.local',
        issuer: 'nuxt-feathers-zod',
        algorithm: 'HS256',
        expiresIn: '1d'
      },
      local: {
        usernameField: 'email',
        passwordField: 'password',
        entityUsernameField: 'email',
        entityPasswordField: 'password'
      }
    },

    database: {
      mongo: {
        url: process.env.MONGO_URL
      }
    }
  }
})
```

## Critical rule: generate `users --auth` correctly

Embedded auth needs NFZ to detect the `users` service, its schema and the runtime entity class.

Required structure:

```txt
services/users/
├─ users.ts
├─ users.class.ts
├─ users.schema.ts
├─ users.shared.ts
└─ users.hooks.ts
```

`users.schema.ts` is mandatory.

It must export a detectable runtime class:

```ts
export class User {}
```

Without the schema and class, embedded auth can fail with an error like:

```txt
Auth is enabled but no service schemas were detected.
Embedded auth requires a local users service/schema.
```

## Password hashing

Password hashing belongs in the Zod resolver, not in a legacy hook.

```ts
import { passwordHash } from '@feathersjs/authentication-local'
import { resolve } from '@feathersjs/schema'

export const userDataResolver = resolve({
  password: passwordHash({ strategy: 'local' })
})
```

Then hide the password in the external resolver:

```ts
export const userExternalResolver = resolve({
  password: async () => undefined
})
```

## Users hooks

`users.hooks.ts` should handle:

- JWT authentication for external access;
- admin restriction;
- self/admin access on `get`;
- public create blocking when needed.

It should not hash the password again.

## UI authentication

In a business app, keep one canonical composable:

```txt
useNfzAuth()
```

Priority:

1. NFZ client;
2. REST fallback to `/feathers/authentication`;
3. local demo fallback only when explicitly enabled.

Recommended variables:

```txt
NFZ_ENABLED=true
AUTH_DEMO_FALLBACK=false
AUTH_SEED_ENABLED=false
```

For a local demo mode:

```txt
NFZ_ENABLED=false
AUTH_DEMO_FALLBACK=true
```

## Session store

The Pinia session store is a UI cache, not the server source of truth.

```txt
Feathers JWT = auth source of truth
Pinia session = UI state
Route middleware = navigation protection
Feathers hooks = server protection
```

## Recommended middleware

```txt
middleware/auth.ts
middleware/admin-auth.ts
middleware/member-auth.ts
```

If your auth still depends on `localStorage`, redirect client-side only to avoid SSR hydration mismatches.

## Server-side RBAC

Critical restrictions must be enforced in Feathers services, not only in UI components.

```ts
function requireAdmin(context) {
  const user = context.params.user

  if (!user?.isAdmin && !user?.roles?.includes('admin')) {
    throw new Forbidden('Admin access required')
  }

  return context
}
```

## Seeds

Seeds must create users through the Feathers service:

```ts
await app.service('users').create({
  email: 'admin@example.local',
  password: 'changeMe',
  roles: ['admin'],
  isAdmin: true
})
```

Do not insert users directly into MongoDB or the `passwordHash()` resolver will not run.

## Common pitfalls

### Manual Quasar plugin

Avoid:

```txt
app/plugins/quasar.ts
```

Prefer:

```ts
modules: ['nuxt-quasar-ui']
```

### Wrong fullscreen plugin

Use:

```ts
plugins: ['AppFullscreen']
```

Do not use:

```ts
plugins: ['Fullscreen']
```

### Users service without `users.schema.ts`

Always provide:

```txt
users.schema.ts
```

### Hashing in hooks

Avoid manual password hashing in `users.hooks.ts`.

Use `passwordHash()` in the resolver.

### `structuredClone()` on Pinia state

Avoid:

```ts
structuredClone(storeObject)
```

Prefer:

```ts
JSON.parse(JSON.stringify(toRaw(storeObject)))
```

### Standalone components inside `app/components`

Do not place exported or legacy standalone components in `app/components/**` when they duplicate existing names.

Use:

```txt
standalone-components/
legacy-components/
exports/standalone-components/
```

## Recommended structure

```txt
app/
├─ components/
├─ composables/
│  ├─ useNfzAuth.ts
│  ├─ useAdminFeathers.ts
│  └─ useRbac.ts
├─ layouts/
│  ├─ marketing.vue
│  ├─ portal.vue
│  └─ admin.vue
├─ middleware/
│  ├─ auth.ts
│  ├─ admin-auth.ts
│  └─ member-auth.ts
├─ pages/
│  ├─ login.vue
│  ├─ admin/
│  └─ members/
├─ stores/
│  ├─ studioSession.ts
│  └─ users.ts
services/
├─ users/
├─ media-assets/
├─ site-sections/
└─ ...
```

## Recommended workflow

```bash
bun install
bun run mongo:up
bun dev
```

Create a business service:

```bash
bunx nuxt-feathers-zod add service news
```

Create the auth service:

```bash
bunx nuxt-feathers-zod add service users --auth
```

Then adapt:

- Zod schemas;
- RBAC hooks;
- external resolver;
- seed;
- Pinia store;
- admin page.
