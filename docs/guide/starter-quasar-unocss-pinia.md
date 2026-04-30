---
editLink: false
---
# Starter principal Quasar + UnoCSS + Pinia

Le starter `nfz-quasar-unocss-pinia-starter` est le modèle applicatif principal recommandé pour démarrer une application métier Nuxt 4 avec NFZ.

Il formalise un flux complet : **Nuxt 4 + Quasar 2 + UnoCSS + Pinia + nuxt-feathers-zod + MongoDB + auth locale JWT + RBAC**.

La référence fonctionnelle auditée est l’archive :

```txt
nfz-quasar-unocss-pinia-starter-6.5.26-mongodb-seed-fix-messages-auth.zip
```

Dans le dépôt du module, ce modèle est maintenu sous :

```txt
examples/nfz-quasar-unocss-pinia-starter
```

La CLI peut le copier avec :

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

Compte créé automatiquement au démarrage :

```txt
admin / admin123
```

## Objectif du modèle

Ce starter n’est pas seulement une démo UI. C’est un **patron d’architecture full-stack** pour les applications NFZ qui ont besoin de :

- une interface dashboard professionnelle avec Quasar 2 ;
- un style rapide et maintenable avec UnoCSS ;
- une session applicative centralisée avec Pinia ;
- un vrai backend Feathers embedded via NFZ ;
- MongoDB local prêt à démarrer avec Docker Compose ;
- un service `users` compatible auth locale/JWT ;
- un service métier `messages` protégé ;
- un seed admin idempotent ;
- une façade d’accès Feathers pour éviter les appels `$api.service(...)` dispersés dans les pages ;
- un middleware global session + RBAC ;
- un layout `QDrawer` Quasar qui évite les overlays bloquants.

## Structure du starter

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

## Responsabilités par couche

| Couche | Fichiers | Rôle |
| --- | --- | --- |
| Configuration | `nuxt.config.ts` | Active Nuxt, Quasar, UnoCSS, Pinia, NFZ, MongoDB, REST, Socket.IO et le module de seed. |
| Base locale | `docker-compose.yaml`, `.env.example` | Lance MongoDB 7 sur un port local dédié et expose `MONGODB_URL`. |
| Backend Feathers | `services/users`, `services/messages` | Déclare les services Feathers MongoDB scannés par NFZ. |
| Seed | `server/feathers/modules/seed-users.ts` | Crée les index MongoDB, l’utilisateur admin et un message de démonstration. |
| Runtime auth | `useSessionStore()` NFZ | Gère le token, la restauration et l’état auth bas niveau. |
| Store session | `app/stores/studioSession.ts` | Encapsule l’auth UI, les rôles, `login()`, `logout()` et `getAuthorizationHeader()`. |
| Middleware | `app/middleware/session.global.ts` | Protège les routes et applique le RBAC via `definePageMeta({ roles })`. |
| Accès Feathers | `app/composables/useAdminFeathers.ts` | Centralise les appels Feathers authentifiés et la normalisation des erreurs. |
| Store métier | `app/stores/messages.ts` | Stocke l’état de page et expose les actions `fetchMessages()`, `createMessage()`, `removeMessage()`. |
| UI | `app/layouts/dashboard.vue`, pages | Rend le dashboard Quasar sans exposer les détails runtime bas niveau. |

## Configuration NFZ + MongoDB

Le starter utilise le mode embedded NFZ avec MongoDB.

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

Point important : la connexion MongoDB est fournie par NFZ. Les services ne créent pas de connexion Nitro parallèle.

## Services Feathers MongoDB

Les services `users` et `messages` utilisent l’adapter officiel Feathers v5 :

```ts
import { MongoDBService } from '@feathersjs/mongodb'

export class MessagesService extends MongoDBService {
  // Les méthodes natives find/get/create/patch/remove viennent de MongoDBService.
}
```

Ils récupèrent la connexion préparée par NFZ :

```ts
const mongoClient = app.get('mongodbClient')

app.use('messages', new MessagesService({
  Model: mongoClient.then(db => db.collection('messages')),
  paginate: app.get('paginate'),
}))
```

Le service `users` sert aussi d’entité d’authentification locale avec `userId` et `password` hashé.

## Seed admin idempotent

Le module serveur :

```txt
server/feathers/modules/seed-users.ts
```

est chargé en phase `post`, donc après l’enregistrement des services.

Il effectue :

- création d’un index unique `users.userId` ;
- création d’un index `messages.createdAt` ;
- création de l’utilisateur `admin` si absent ;
- hashing du mot de passe via le resolver du service `users` ;
- création d’un premier message si la collection est vide.

Les identifiants peuvent être changés dans `.env` :

```txt
NFZ_DEMO_USER=admin
NFZ_DEMO_PASSWORD=admin123
NFZ_DEMO_ROLES=admin,user
```

## Flow d’authentification

```txt
/login.vue
  ↓
useLocalAuthUi()
  ↓
useStudioSessionStore().login()
  ↓
buildLocalAuthPayload()
  ↓
useSessionStore() / useAuthRuntime() NFZ
  ↓
POST /feathers/authentication
  ↓
JWT + user + roles
  ↓
session.global.ts
  ↓
useAdminFeathers()
  ↓
services Feathers protégés
```

### Règle d’architecture

Les pages critiques ne doivent pas faire ceci :

```ts
const { $api } = useNuxtApp()
await $api.service('messages').find()
```

Elles passent par le store ou la façade applicative :

```ts
const messages = useMessagesStore()
await messages.fetchMessages()
```

Puis le store délègue à :

```ts
const api = useAdminFeathers()
const rows = await api.messages.find()
```

## Store session applicatif

`studioSession` encapsule l’état UI et RBAC au-dessus du runtime NFZ.

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

La page `login.vue` reste donc simple : elle pilote l’UI, pas le protocole Feathers.

## Middleware session + RBAC

Le middleware global protège toutes les routes non publiques.

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

Une page protégée déclare ses rôles :

```ts
definePageMeta({
  layout: 'dashboard',
  roles: ['admin', 'user'],
})
```

## Façade d’accès Feathers

`useAdminFeathers()` centralise l’accès aux services protégés.

```ts
async function authParams(query?: Record<string, unknown>) {
  await ensureAuthenticated()

  const accessToken = session.accessToken
  const authorization = await session.getAuthorizationHeader()

  if (!accessToken || !authorization)
    throw new Forbidden('Session NFZ restaurée mais token JWT indisponible.')

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

Ce point corrige le cas où l’UI indique une session active, mais un appel REST Feathers protégé échoue parce que le JWT n’est pas transmis explicitement.

La façade normalise aussi les erreurs pour éviter l’affichage :

```txt
[object Object]
```

et transforme les documents MongoDB pour avoir un `id` exploitable côté UI :

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

## Store métier inspiré Feathers-Pinia

Le store `messages` reprend l’idée Feathers-Pinia : l’état métier est dans Pinia, les pages consomment des actions haut niveau, et la couche d’accès sait parler à Feathers.

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

Ce starter ne dépend pas de `feathers-pinia` pour le runtime client standard. Il conserve une approche compatible avec l’esprit Feathers-Pinia, mais plus robuste pour Nuxt 4 + ESM.

## Layout dashboard Quasar et QDrawer

Le layout dashboard suit la convention Quasar :

```txt
QLayout
└─ QHeader
└─ QDrawer
   └─ QScrollArea
      └─ QList
         └─ QItem
└─ QPageContainer
```

Le comportement drawer est isolé dans `useDrawerSafeState()` :

- desktop : drawer non overlay ;
- mobile : drawer overlay ;
- fermeture automatique après clic mobile ;
- CSS de protection contre les backdrops invisibles qui bloquent les boutons.

Dans la variante maintenue du starter, le ripple Quasar peut être désactivé pour limiter les warnings navigateur `touchstart` non passifs :

```ts
quasar: {
  config: {
    ripple: false,
  },
}
```

et les pages dashboard sont souvent déclarées en rendu client si l’intégration Quasar/SSR provoque des mismatches d’hydratation :

```ts
routeRules: {
  '/dashboard': { ssr: false },
  '/messages': { ssr: false },
  '/session': { ssr: false },
}
```

## Bonnes pratiques retenues

1. Utiliser NFZ pour créer les services Feathers, pas des endpoints Nitro custom pour le métier.
2. Garder `studioSession` comme source UI/RBAC, et laisser NFZ gérer le runtime auth réel.
3. Ne pas exposer `$api.service(...)` directement dans les pages critiques.
4. Centraliser les paramètres JWT dans une façade comme `useAdminFeathers()`.
5. Normaliser les erreurs Feathers avant affichage.
6. Normaliser `_id` MongoDB vers `id` avant de l’utiliser dans les composants Quasar.
7. Utiliser des stores métier Pinia inspirés de Feathers-Pinia sans forcer `feathers-pinia` côté navigateur.
8. Garder MongoDB via `feathers.database.mongo`, pas via une connexion parallèle.
9. Documenter les credentials de seed uniquement pour le développement local.

## Quand utiliser ce modèle

Utilise ce starter quand tu veux construire :

- un dashboard admin ;
- une console métier interne ;
- une application Nuxt 4 full-stack avec MongoDB ;
- une base NFZ Studio-like ;
- une application avec auth locale, rôles et services Feathers protégés ;
- un projet qui doit rester compatible avec Quasar 2 et UnoCSS.

Pour une API seule, commence plutôt par `init embedded`. Pour un frontend connecté à une API existante, commence par `init remote`.
