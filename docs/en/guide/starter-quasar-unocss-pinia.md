---
editLink: false
---
# Main Quasar + UnoCSS + Pinia starter

The `nfz-quasar-unocss-pinia-starter` starter is the recommended main application model for starting a business-oriented Nuxt 4 app with NFZ.

It formalizes a complete flow: **Nuxt 4 + Quasar 2 + UnoCSS + Pinia + nuxt-feathers-zod + MongoDB + local JWT auth + RBAC**.

The audited working reference is:

```txt
nfz-quasar-unocss-pinia-starter-6.5.26-mongodb-seed-fix-messages-auth.zip
```

In the module repository, the maintained model lives under:

```txt
examples/nfz-quasar-unocss-pinia-starter
```

The CLI can copy it with:

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

Seeded account:

```txt
admin / admin123
```

## Goal

This starter is not only a UI demo. It is a **full-stack architecture pattern** for NFZ applications that need:

- a professional dashboard UI with Quasar 2;
- fast maintainable styling with UnoCSS;
- centralized application session state with Pinia;
- a real embedded Feathers backend through NFZ;
- local MongoDB through Docker Compose;
- a `users` service compatible with local/JWT auth;
- a protected `messages` business service;
- an idempotent admin seed;
- a Feathers access facade to avoid spreading `$api.service(...)` calls in pages;
- global session middleware and RBAC;
- a Quasar `QDrawer` layout that avoids blocking overlay issues.

## Structure

```txt
.
├─ docker-compose.yaml
├─ .env.example
├─ nuxt.config.ts
├─ uno.config.ts
├─ app/
│  ├─ app.vue
│  ├─ composables/
│  │  ├─ useAdminFeathers.ts
│  │  ├─ useDrawerSafeState.ts
│  │  └─ useLocalAuthUi.ts
│  ├─ layouts/
│  │  ├─ default.vue
│  │  └─ dashboard.vue
│  ├─ middleware/
│  │  └─ session.global.ts
│  ├─ pages/
│  │  ├─ index.vue
│  │  ├─ login.vue
│  │  ├─ dashboard.vue
│  │  ├─ messages.vue
│  │  └─ session.vue
│  ├─ stores/
│  │  ├─ studioSession.ts
│  │  └─ messages.ts
│  ├─ types/
│  │  ├─ auth.ts
│  │  └─ route-meta.d.ts
│  └─ utils/
│     └─ errors.ts
├─ services/
│  ├─ users/
│  │  ├─ users.ts
│  │  ├─ users.class.ts
│  │  ├─ users.schema.ts
│  │  └─ users.shared.ts
│  └─ messages/
│     ├─ messages.ts
│     ├─ messages.class.ts
│     ├─ messages.schema.ts
│     └─ messages.shared.ts
└─ server/
   └─ feathers/
      └─ modules/
         └─ seed-users.ts
```

## Layer responsibilities

| Layer | Files | Role |
| --- | --- | --- |
| Configuration | `nuxt.config.ts` | Enables Nuxt, Quasar, UnoCSS, Pinia, NFZ, MongoDB, REST, Socket.IO and the seed module. |
| Local database | `docker-compose.yaml`, `.env.example` | Starts MongoDB 7 on a dedicated local port and exposes `MONGODB_URL`. |
| Feathers backend | `services/users`, `services/messages` | Declares MongoDB Feathers services scanned by NFZ. |
| Seed | `server/feathers/modules/seed-users.ts` | Creates MongoDB indexes, the admin user and a demo message. |
| Auth runtime | NFZ `useSessionStore()` | Manages token, restore and low-level auth state. |
| Session store | `app/stores/studioSession.ts` | Wraps UI auth, roles, `login()`, `logout()` and `getAuthorizationHeader()`. |
| Middleware | `app/middleware/session.global.ts` | Protects routes and applies RBAC through `definePageMeta({ roles })`. |
| Feathers access | `app/composables/useAdminFeathers.ts` | Centralizes authenticated Feathers calls and error normalization. |
| Business store | `app/stores/messages.ts` | Exposes `fetchMessages()`, `createMessage()` and `removeMessage()` for pages. |
| UI | `app/layouts/dashboard.vue`, pages | Renders the Quasar dashboard without leaking low-level runtime details. |

## NFZ + MongoDB configuration

The starter uses embedded NFZ mode with MongoDB.

```ts
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    'nuxt-quasar-ui',
    'nuxt-feathers-zod',
  ],

  feathers: {
    auth: {
      authStrategies: ['local', 'jwt'],
      local: {
        usernameField: 'userId',
        passwordField: 'password',
        entityUsernameField: 'userId',
        entityPasswordField: 'password',
      },
    },
    servicesDirs: ['services'],
    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      },
    },
    database: {
      mongo: {
        url: process.env.MONGODB_URL
          || 'mongodb://root:changeMe@127.0.0.1:27037/nfz_starter?authSource=admin',
        management: {
          enabled: true,
          basePath: '/mongo-admin',
          auth: {
            enabled: true,
            authenticate: true,
            adminRoleNames: ['admin'],
            rolesField: 'roles',
          },
        },
      },
    },
    server: {
      modules: [
        {
          src: 'server/feathers/modules/seed-users.ts',
          phase: 'post',
        },
      ],
      secureDefaults: true,
    },
    client: {
      mode: 'embedded',
      pinia: {
        idField: 'id',
      },
    },
  },
})
```

MongoDB is provided by NFZ. Services do not create a parallel Nitro connection.

## Feathers MongoDB services

`users` and `messages` use the official Feathers v5 adapter:

```ts
import { MongoDBService } from '@feathersjs/mongodb'

export class MessagesService extends MongoDBService {
  // Native find/get/create/patch/remove methods come from MongoDBService.
}
```

They use the connection prepared by NFZ:

```ts
const mongoClient = app.get('mongodbClient')

app.use('messages', new MessagesService({
  Model: mongoClient.then(db => db.collection('messages')),
  paginate: app.get('paginate'),
}))
```

The `users` service is also the local authentication entity using `userId` and hashed `password`.

## Idempotent admin seed

The server module:

```txt
server/feathers/modules/seed-users.ts
```

runs in the `post` phase, after services are registered.

It performs:

- unique index creation for `users.userId`;
- `messages.createdAt` index creation;
- admin user creation when missing;
- password hashing through the `users` service resolver;
- first demo message creation when the collection is empty.

Credentials can be changed in `.env`:

```txt
NFZ_DEMO_USER=admin
NFZ_DEMO_PASSWORD=admin123
NFZ_DEMO_ROLES=admin,user
```

## Authentication flow

```txt
/login.vue
  ↓
useLocalAuthUi()
  ↓
useStudioSessionStore().login()
  ↓
buildLocalAuthPayload()
  ↓
NFZ useSessionStore() / useAuthRuntime()
  ↓
POST /feathers/authentication
  ↓
JWT + user + roles
  ↓
session.global.ts
  ↓
useAdminFeathers()
  ↓
protected Feathers services
```

### Architecture rule

Critical pages should not do this:

```ts
const { $api } = useNuxtApp()
await $api.service('messages').find()
```

They go through the store or the application facade:

```ts
const messages = useMessagesStore()
await messages.fetchMessages()
```

Then the store delegates to:

```ts
const api = useAdminFeathers()
const rows = await api.messages.find()
```

## Application session store

`studioSession` wraps UI and RBAC state above the NFZ runtime.

```ts
export const useStudioSessionStore = defineStore('studioSession', () => {
  const nfzSession = useSessionStore()
  const runtimeConfig = useRuntimeConfig()

  const authenticated = computed(() => nfzSession.authenticated)
  const accessToken = computed(() => nfzSession.accessToken)
  const user = computed(() => nfzSession.user)
  const roles = computed(() => user.value?.roles?.map(String) ?? [])

  async function login(credentials: { userId: string, password: string }) {
    const publicFeathers = (runtimeConfig.public as any)._feathers
    const localAuth = publicFeathers?.auth?.local
    const payload = buildLocalAuthPayload(credentials.userId, credentials.password, localAuth)

    await nfzSession.login(payload)
  }

  async function getAuthorizationHeader(): Promise<string | null> {
    return await nfzSession.getAuthorizationHeader()
  }

  return {
    authenticated,
    accessToken,
    user,
    roles,
    login,
    getAuthorizationHeader,
  }
})
```

`login.vue` therefore controls the UI, not the Feathers protocol.

## Session middleware + RBAC

The global middleware protects every non-public route.

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  if (to.meta.public)
    return

  const session = useStudioSessionStore()
  await session.restore('route-middleware')

  if (!session.authenticated) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  const requiredRoles = Array.isArray(to.meta.roles)
    ? to.meta.roles
    : []

  if (requiredRoles.length && !session.hasAnyRole(requiredRoles)) {
    return navigateTo({
      path: '/dashboard',
      query: { forbidden: '1' },
    })
  }
})
```

A protected page declares its roles:

```ts
definePageMeta({
  layout: 'dashboard',
  roles: ['admin', 'user'],
})
```

## Feathers access facade

`useAdminFeathers()` centralizes access to protected services.

```ts
async function authParams(query?: Record<string, unknown>) {
  await ensureAuthenticated()

  const accessToken = session.accessToken
  const authorization = await session.getAuthorizationHeader()

  if (!accessToken || !authorization)
    throw new Forbidden('NFZ session restored but JWT token is unavailable.')

  return {
    query,
    headers: {
      Authorization: authorization,
    },
    authentication: {
      strategy: 'jwt',
      accessToken,
    },
  }
}
```

This fixes the case where the UI session is active, but a protected Feathers REST call fails because the JWT is not explicitly passed.

The facade also normalizes errors to avoid showing:

```txt
[object Object]
```

and normalizes MongoDB documents so the UI can use `id`:

```ts
function normalizeMongoRecord<T extends { id?: string, _id?: string }>(record: T): T {
  if (record.id != null || record._id == null)
    return record

  return {
    ...record,
    id: String(record._id),
    _id: String(record._id),
  }
}
```

## Business store inspired by Feathers-Pinia

The `messages` store follows the Feathers-Pinia idea: business state is in Pinia, pages consume high-level actions, and the access layer knows how to talk to Feathers.

```ts
export const useMessagesStore = defineStore('messages', () => {
  const items = ref<MessageRecord[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchMessages(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const api = useAdminFeathers()
      items.value = await api.messages.find()
    }
    catch (err) {
      error.value = getErrorMessage(err)
    }
    finally {
      loading.value = false
    }
  }

  return {
    items,
    loading,
    saving,
    error,
    fetchMessages,
  }
})
```

This starter does not depend on `feathers-pinia` for the standard browser runtime. It keeps a Feathers-Pinia-compatible architecture style while being safer for Nuxt 4 + ESM.

## Quasar dashboard layout and QDrawer

The dashboard layout follows the Quasar convention:

```txt
QLayout
└─ QHeader
└─ QDrawer
   └─ QScrollArea
      └─ QList
         └─ QItem
└─ QPageContainer
```

Drawer behavior is isolated in `useDrawerSafeState()`:

- desktop: non-overlay drawer;
- mobile: overlay drawer;
- automatic close after mobile navigation click;
- CSS protection against invisible backdrops that block buttons.

In the maintained starter variant, Quasar ripple can be disabled to reduce browser `touchstart` non-passive warnings:

```ts
quasar: {
  config: {
    ripple: false,
  },
}
```

and dashboard pages are often declared client-rendered when the Quasar/SSR integration causes hydration mismatches:

```ts
routeRules: {
  '/dashboard': { ssr: false },
  '/messages': { ssr: false },
  '/session': { ssr: false },
}
```

## Best practices

1. Use NFZ to create Feathers services, not custom Nitro endpoints for business logic.
2. Keep `studioSession` as the UI/RBAC source, and let NFZ handle the real auth runtime.
3. Do not expose `$api.service(...)` directly in critical pages.
4. Centralize JWT params in a facade such as `useAdminFeathers()`.
5. Normalize Feathers errors before displaying them.
6. Normalize MongoDB `_id` to `id` before using records in Quasar components.
7. Use Pinia business stores inspired by Feathers-Pinia without forcing `feathers-pinia` in the browser runtime.
8. Keep MongoDB wired through `feathers.database.mongo`, not through a parallel connection.
9. Document seed credentials only for local development.

## When to use this model

Use this starter when building:

- an admin dashboard;
- an internal business console;
- a full-stack Nuxt 4 app with MongoDB;
- an NFZ Studio-like base;
- an app with local auth, roles and protected Feathers services;
- a project that must remain compatible with Quasar 2 and UnoCSS.

For an API-only app, start with `init embedded`. For a frontend connected to an existing API, start with `init remote`.
