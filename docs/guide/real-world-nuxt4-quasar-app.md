---
editLink: false
---
# Intégrer NFZ dans une vraie application Nuxt 4 + Quasar + Pinia

Ce guide explique comment intégrer `nuxt-feathers-zod` dans une application métier complète basée sur :

- Nuxt 4 ;
- Vue 3 ;
- Quasar 2 via `nuxt-quasar-ui` ;
- UnoCSS ;
- Pinia ;
- MongoDB ;
- FeathersJS v5 embedded ;
- Auth locale/JWT ;
- RBAC admin/member ;
- services métier NFZ.

Pour une application avec dashboard, administration, authentification et services métier, le starter recommandé est :

```bash
git clone https://github.com/vevedh/nfz-quasar-unocss-pinia-starter
```

Ce starter doit être considéré comme la référence d'intégration complète.

## Quand utiliser ce guide ?

Utilise ce guide si ton application ressemble à :

```txt
app/
├─ layouts/
│  ├─ marketing.vue
│  ├─ portal.vue
│  └─ admin.vue
├─ pages/
│  ├─ login.vue
│  ├─ admin/
│  └─ espace-adherents/
├─ stores/
│  └─ studioSession.ts
├─ middleware/
│  ├─ auth.ts
│  ├─ admin-auth.ts
│  └─ member-auth.ts
services/
└─ users/
```

## Installation minimale

```bash
bun add nuxt-feathers-zod
bun add @pinia/nuxt pinia
bun add nuxt-quasar-ui quasar @quasar/extras
bun add -D unocss @unocss/nuxt
```

## Configuration Nuxt recommandée

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

## Règle critique : générer `users --auth` correctement

Pour l'auth embedded, NFZ doit détecter le service `users`, son schéma et sa classe runtime.

Structure obligatoire :

```txt
services/users/
├─ users.ts
├─ users.class.ts
├─ users.schema.ts
├─ users.shared.ts
└─ users.hooks.ts
```

Le fichier `users.schema.ts` est obligatoire.

Il doit exporter une classe runtime détectable :

```ts
export class User {}
```

Sans cette classe et sans schéma, l'auth embedded peut échouer avec une erreur du type :

```txt
Auth is enabled but no service schemas were detected.
Embedded auth requires a local users service/schema.
```

## Hash du mot de passe

Le hash du mot de passe doit être géré dans le resolver Zod, pas dans un hook legacy.

```ts
import { passwordHash } from '@feathersjs/authentication-local'
import { resolve } from '@feathersjs/schema'

export const userDataResolver = resolve({
  password: passwordHash({ strategy: 'local' })
})
```

Puis masquer le mot de passe dans le resolver externe :

```ts
export const userExternalResolver = resolve({
  password: async () => undefined
})
```

## Hooks users

Les hooks `users.hooks.ts` doivent gérer :

- authentification JWT pour les accès externes ;
- restriction admin ;
- accès self/admin sur `get` ;
- interdiction de création publique si nécessaire.

Ils ne doivent pas refaire le hash du mot de passe.

## Auth côté UI

Dans une application métier, il est recommandé d'avoir un composable unique :

```txt
useNfzAuth()
```

Priorité :

1. client NFZ ;
2. fallback REST `/feathers/authentication` ;
3. fallback local démo seulement si explicitement activé.

Variables recommandées :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
NFZ_ENABLED=true
AUTH_DEMO_FALLBACK=false
AUTH_SEED_ENABLED=false
```

Pour un mode démo local :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
NFZ_ENABLED=false
AUTH_DEMO_FALLBACK=true
```

## Store session

Le store Pinia doit rester un cache UI, pas la source de vérité serveur.

```txt
Feathers JWT = vérité auth
Pinia session = état UI
RBAC middleware = protection navigation
RBAC hooks Feathers = protection serveur
```

## Middlewares recommandés

```txt
middleware/auth.ts
middleware/admin-auth.ts
middleware/member-auth.ts
```

Avec une auth encore dépendante de `localStorage`, les redirections doivent être faites côté client uniquement pour éviter les mismatches SSR.

## RBAC serveur

Les restrictions critiques doivent être appliquées dans les services Feathers, pas seulement dans l'UI.

Exemple :

```ts
import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from '@feathersjs/feathers'

export function requireAdmin(context: HookContext): HookContext {
  const user = context.params.user as { isAdmin?: boolean, roles?: string[], groups?: string[] } | undefined
  const roles = [...(user?.roles ?? []), ...(user?.groups ?? [])].map((role) => role.toLowerCase())

  if (!user?.isAdmin && !roles.includes('admin')) {
    throw new Forbidden('Accès admin requis')
  }

  return context
}
```

## Seeds

Les seeds doivent créer les utilisateurs via le service Feathers :

```ts
await app.service('users').create({
  email: 'admin@example.local',
  password: 'changeMe',
  roles: ['admin'],
  isAdmin: true
})
```

Ne pas insérer directement en MongoDB, sinon le resolver `passwordHash()` ne sera pas appliqué.

Variables utiles :

<<<<<<< HEAD
```txt
=======
```env
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
AUTH_SEED_ENABLED=true
AUTH_SEED_UPDATE_EXISTING=true
AUTH_SEED_RESET=false
```

## Pièges fréquents

### 1. Plugin Quasar manuel

Éviter :

```txt
app/plugins/quasar.ts
```

Préférer :

```ts
modules: ['nuxt-quasar-ui']
```

### 2. Mauvais plugin fullscreen

Utiliser :

```ts
plugins: ['AppFullscreen']
```

Ne pas utiliser :

```ts
plugins: ['Fullscreen']
```

### 3. Service users sans `users.schema.ts`

Toujours fournir :

```txt
users.schema.ts
```

### 4. Hash dans hooks

Éviter le hash manuel dans `users.hooks.ts`.

Utiliser `passwordHash()` dans le resolver.

### 5. `structuredClone()` sur Pinia

Éviter :

```ts
structuredClone(storeObject)
```

Préférer :

```ts
import { toRaw } from 'vue'

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value))) as T
}
```

### 6. Composants autonomes dans `app/components`

Ne pas placer de composants exportables ou legacy dans `app/components/**` s'ils dupliquent des noms existants.

Utiliser :

```txt
standalone-components/
legacy-components/
exports/standalone-components/
```

## Structure conseillée pour une app métier

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
│  └─ espace-adherents/
├─ stores/
│  ├─ studioSession.ts
│  └─ users.ts
services/
├─ users/
├─ media-assets/
├─ site-sections/
└─ ...
```

## Workflow recommandé

```bash
bun install
bun run mongo:up
bun dev
```

Pour créer un service métier :

```bash
bunx nuxt-feathers-zod add service news
```

Pour créer un service auth :

```bash
bunx nuxt-feathers-zod add service users --auth
```

Ensuite, adapter :

- schémas Zod ;
- hooks RBAC ;
- resolver externe ;
- seed ;
- store Pinia ;
- page admin.
