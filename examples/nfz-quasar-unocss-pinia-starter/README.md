# NFZ Quasar UnoCSS Pinia Starter

Starter **Nuxt 4 + Quasar 2 + UnoCSS + Pinia + nuxt-feathers-zod 6.5.29** avec MongoDB local prêt à l’emploi.

Il fournit :

- MongoDB via `docker-compose.yaml` ;
- configuration NFZ `database.mongo.url` ;
- services Feathers `users` et `messages` branchés sur `@feathersjs/mongodb` ;
- seed idempotent du compte admin ;
- seed d’un premier message de démonstration ;
- auth locale Feathers/NFZ réelle ;
- middleware global de session ;
- store Pinia `studioSession` ;
- store métier `messages` inspiré du pattern Feathers-Pinia ;
- couche d’accès `useAdminFeathers()` pour éviter les appels `$api.service(...)` dans les pages critiques ;
- RBAC simple par `roles` dans `definePageMeta()` ;
- layout dashboard Quasar avec `QDrawer` sécurisé contre les overlays bloquants ;
- design Enterprise Blue / Slate avec UnoCSS.

## Démarrage rapide

```bash
bun install
cp .env.example .env
bun run db:up
bun dev
```

Ou en une seule commande après installation :

```bash
bun run dev:db
```

Compte seedé au démarrage :

```txt
admin / admin123
```

MongoDB local :

```txt
mongodb://root:changeMe@127.0.0.1:27037/nfz_starter?authSource=admin
```

## Commandes MongoDB

```bash
bun run db:up      # démarre MongoDB
bun run db:logs    # affiche les logs MongoDB
bun run db:down    # arrête MongoDB
```

## Dépendance NFZ 6.5.29

Le `package.json` cible :

```json
"nuxt-feathers-zod": "6.5.29"
```

Si la version 6.5.29 n’est pas encore publiée sur npm, utilise ton tarball local :

```bash
# depuis le dépôt nuxt-feathers-zod 6.5.29
bun install
bun run build
npm pack

# dans ce starter
bun remove nuxt-feathers-zod
bun add ../nuxt-feathers-zod/nuxt-feathers-zod-6.5.29.tgz
```

## Architecture

```txt
app/
├─ composables/
│  ├─ useAdminFeathers.ts      # façade Feathers applicative
│  ├─ useDrawerSafeState.ts    # anti-overlay QDrawer
│  └─ useLocalAuthUi.ts        # état du formulaire login
├─ layouts/
│  ├─ default.vue
│  └─ dashboard.vue
├─ middleware/
│  └─ session.global.ts        # auth + RBAC route meta
├─ pages/
│  ├─ login.vue
│  ├─ dashboard.vue
│  ├─ messages.vue
│  └─ session.vue
├─ stores/
│  ├─ studioSession.ts         # session + rôles
│  └─ messages.ts              # store métier façon Feathers-Pinia
└─ types/

services/
├─ users/                      # service d’auth locale MongoDB
└─ messages/                   # service MongoDB protégé JWT

server/feathers/modules/
└─ seed-users.ts               # indexes + seed admin + message initial
```

## Configuration NFZ + MongoDB

Le starter configure NFZ directement dans `nuxt.config.ts` :

```ts
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
  database: {
    mongo: {
      url: process.env.MONGODB_URL || 'mongodb://root:changeMe@127.0.0.1:27037/nfz_starter?authSource=admin',
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
}
```

Les services `users` et `messages` utilisent :

```ts
import { MongoDBService } from '@feathersjs/mongodb'
```

et récupèrent la connexion officielle NFZ :

```ts
const mongoClient = app.get('mongodbClient')
```

## Flow d’authentification

```txt
/login.vue
  ↓ useLocalAuthUi()
useStudioSessionStore.login()
  ↓ buildLocalAuthPayload()
useSessionStore / useAuthRuntime NFZ
  ↓
POST /feathers/authentication
  ↓
JWT + user + roles
  ↓
session.global.ts protège les routes
  ↓
useAdminFeathers() autorise les appels métier
```

## Règle importante

Les pages critiques ne font pas ceci :

```ts
const { $api } = useNuxtApp()
await $api.service('messages').find()
```

Elles passent par un store ou une façade :

```ts
const messages = useMessagesStore()
await messages.fetchMessages()
```

La façade centralise l’accès Feathers :

```ts
const api = useAdminFeathers()
await api.messages.find()
```

## RBAC

Déclare les rôles sur la page :

```ts
definePageMeta({
  layout: 'dashboard',
  roles: ['admin', 'user'],
})
```

Le middleware lit `to.meta.roles` et vérifie :

```ts
session.hasAnyRole(requiredRoles)
```

## QDrawer anti-overlay

Le layout utilise :

```vue
<QDrawer
  v-model="drawerOpen"
  :behavior="drawerBehavior"
  :overlay="drawerOverlay"
  show-if-above
  :breakpoint="1024"
/>
```

La logique est isolée dans `useDrawerSafeState()`, et le CSS neutralise les backdrops cachés qui peuvent bloquer les clics.

## Bonnes pratiques reprises dans ce starter

1. **NFZ pour le backend Feathers**, pas des endpoints Nitro custom inutiles.
2. **MongoDB via `database.mongo` NFZ**, pas une connexion parallèle dans Nitro.
3. **Pinia pour la session et l’état UI**, pas pour remplacer le runtime Feathers.
4. **Façade d’accès Feathers** pour éviter la dispersion de `$api.service(...)`.
5. **RBAC déclaratif** via `definePageMeta()`.
6. **QDrawer idiomatique Quasar** : `QScrollArea > QList > QItem` avec props de routing.
7. **UnoCSS pour l’identité visuelle**, Quasar pour les composants productifs.

## Commandes utiles

```bash
bun run db:up
bun dev
bun typecheck
bun lint:fix
bun build
```

## Correctif `/messages` 0.1.2

La page `/messages` utilise volontairement une couche d'accès centralisée (`useAdminFeathers`) plutôt que des appels directs `$api.service(...)` dans la page.

Depuis `0.1.2`, cette couche injecte explicitement le JWT dans les appels Feathers protégés :

```ts
headers: {
  Authorization: `Bearer ${accessToken}`,
},
authentication: {
  strategy: 'jwt',
  accessToken,
}
```

Cela évite le cas où l'UI affiche une session active mais où l'appel REST Feathers reçoit une requête sans authentification exploitable. Les erreurs Feathers sont aussi normalisées pour éviter l'affichage `[object Object]`.

## Patch 0.1.3 - Hydration / Quasar ripple cleanup

- Ajout de `routeRules` `ssr:false` pour les pages privées `/dashboard`, `/messages` et `/session` afin d'éviter le mismatch SSR/client lors des redirections d'authentification côté session.
- Désactivation globale du ripple Quasar (`quasar.config.ripple=false`) pour réduire les warnings navigateur `touchstart` non-passive liés aux effets tactiles.
- `useDrawerSafeState()` attend maintenant l'hydratation client avant d'utiliser `$q.screen`, ce qui stabilise le comportement du `QDrawer`.
