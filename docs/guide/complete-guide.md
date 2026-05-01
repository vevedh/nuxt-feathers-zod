# Guide complet nuxt-feathers-zod

`nuxt-feathers-zod` est un module Nuxt 4 conçu pour accélérer la création d’applications full-stack autour de FeathersJS v5, Nitro, Zod, MongoDB, Pinia et des générateurs CLI reproductibles.

Ce guide s’adresse aux développeurs qui veulent comprendre le module, l’installer proprement, générer des services, choisir entre le mode embedded et remote, activer l’authentification, utiliser le client côté Nuxt et exploiter le CLI sans perdre la cohérence du projet.

## Table des matières

[[toc]]

## 1. Objectif du module

Le module répond à un besoin simple : éviter de reconstruire à la main le même socle backend/client à chaque projet Nuxt.

Il apporte :

- un serveur FeathersJS v5 embarqué dans Nuxt/Nitro en mode **embedded** ;
- un client Feathers typé pour consommer une API externe en mode **remote** ;
- une génération CLI de services, middlewares, server modules, templates et configuration ;
- une prise en charge optionnelle de Zod, JSON Schema, MongoDB, Swagger, Keycloak, Pinia et des diagnostics ;
- une architecture compatible avec les projets Nuxt 4 modernes, monorepo ou front séparé.

## 2. Architecture mentale

NFZ peut être utilisé selon deux modèles.

### Mode embedded

Le serveur Feathers tourne dans le runtime Nitro de Nuxt.

```txt
Nuxt 4
└─ Nitro
   └─ FeathersJS v5
      ├─ services/
      ├─ hooks
      ├─ authentication
      ├─ MongoDB optionnel
      └─ transports REST / Socket.IO
```

Les services sont exposés par défaut sous :

```txt
/feathers/<service>
```

Exemple :

```http
GET http://localhost:3000/feathers/users
```

### Mode remote

Nuxt ne démarre pas de serveur Feathers local. Il installe uniquement le client Feathers et se connecte à une API distante.

```txt
Nuxt 4
└─ Client Feathers
   ├─ REST ou Socket.IO
   ├─ auth JWT ou Keycloak payload
   └─ services distants déclarés
```

Ce mode est adapté aux architectures où l’API Feathers existe déjà ou tourne dans un autre déploiement.

## 3. Installation

### Préparer une application Nuxt 4

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
```

Ajoute ensuite le module dans `nuxt.config.ts`.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nuxt-feathers-zod',
  ],

  feathers: {
    servicesDirs: ['services'],
  },
})
```

### Initialisation recommandée

Pour un backend embarqué :

```bash
bunx nuxt-feathers-zod init embedded --force
```

Pour un client vers une API distante :

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
```

Pour démarrer depuis le starter principal :

```bash
bunx nuxt-feathers-zod init starter \
  --preset quasar-unocss-pinia-auth \
  --dir nfz-starter
```

## 4. Configuration minimale

Une configuration embedded simple :

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  feathers: {
    servicesDirs: ['services'],

    client: {
      mode: 'embedded',
      pinia: true,
    },

    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: true,
    },

    server: {
      enabled: true,
      framework: 'express',
      secureDefaults: true,
    },

    auth: false,
    swagger: false,
    devtools: true,
  },
})
```

Une configuration remote simple :

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '/feathers',
        services: [
          { path: 'users', methods: ['find', 'get'] },
          { path: 'messages', methods: ['find', 'get', 'create'] },
        ],
      },
    },

    server: {
      enabled: false,
    },

    auth: false,
  },
})
```

## 5. Options principales

| Option | Rôle | Usage recommandé |
|---|---|---|
| `servicesDirs` | Dossiers scannés pour les services Feathers locaux | `['services']` |
| `client` | Active et configure le client Nuxt | `true` ou objet |
| `client.mode` | Choix `embedded` ou `remote` | `embedded` pour monorepo, `remote` pour API externe |
| `transports.rest` | Transport REST | Objet ou `false` |
| `transports.websocket` | Transport Socket.IO | `true`, objet ou `false` |
| `server` | Runtime Feathers embarqué | Activé en embedded |
| `auth` | Auth Feathers locale/JWT | `false`, `true` ou objet |
| `keycloak` | SSO Keycloak côté client | Objet ou `false` |
| `database.mongo` | Connexion MongoDB et management | Objet avec `url` |
| `swagger` | Swagger legacy | À activer explicitement |
| `templates` | Overrides de templates générés | Pour personnalisation avancée |
| `devtools` | Onglet DevTools NFZ en dev | `true` par défaut |
| `console` | Console/builder runtime | Usage avancé |

## 6. Services Feathers

### Règle de base

Génère les services avec le CLI au lieu de créer les fichiers manuellement. Cela garde alignés :

- le fichier de service ;
- la classe ;
- le schéma ;
- le shared client ;
- le manifest NFZ ;
- les hooks d’auth et de validation.

### Service mémoire

```bash
bunx nuxt-feathers-zod add service messages \
  --adapter memory \
  --schema zod
```

Structure générée typique :

```txt
services/messages/
├─ messages.ts
├─ messages.class.ts
├─ messages.schema.ts
└─ messages.shared.ts
```

### Service MongoDB

```bash
bunx nuxt-feathers-zod add service users \
  --adapter mongodb \
  --collection users \
  --schema zod \
  --idField _id
```

Configuration MongoDB côté Nuxt :

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
      },
    },

    servicesDirs: ['services'],
  },
})
```

### Service avec méthodes custom

Les méthodes custom sont utiles pour des actions métier non CRUD : `run`, `preview`, `import`, `export`, `sync`, etc.

```bash
bunx nuxt-feathers-zod add service actions \
  --custom \
  --methods find,get \
  --customMethods run,preview \
  --schema zod
```

Exemple d’appel côté client :

```ts
const { $api } = useNuxtApp()

const result = await $api.service('actions').run({
  name: 'preview',
  payload: { service: 'users' },
})
```

### File service

Le file service fournit un squelette local pour upload/download.

```bash
bunx nuxt-feathers-zod add file-service assets \
  --path api/v1/assets \
  --storageDir storage/assets \
  --auth true
```

Bonnes pratiques :

- ne jamais exposer directement le dossier de stockage sans contrôle ;
- normaliser les noms de fichiers ;
- vérifier le type MIME et la taille ;
- enregistrer les métadonnées dans un service métier si les fichiers doivent être audités.

### Services distants

En mode remote, déclare les services consommés côté client.

```bash
bunx nuxt-feathers-zod add remote-service users \
  --path users \
  --methods find,get,create,patch,remove
```

Exemple de configuration :

```ts
export default defineNuxtConfig({
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'socketio',
        websocketPath: '/socket.io',
        services: [
          { path: 'users', methods: ['find', 'get', 'create'] },
        ],
      },
    },
  },
})
```

## 7. Schémas et validation

NFZ supporte trois modes.

| Mode | Comportement | Quand l’utiliser |
|---|---|---|
| `none` | Pas de schéma généré | Prototype, service simple |
| `zod` | Schémas Zod + validation | Standard recommandé |
| `json` | JSON Schema/AJV | Compatibilité Feathers schema |

### Inspecter un schéma

```bash
bunx nuxt-feathers-zod schema users --show
```

### Modifier le mode

```bash
bunx nuxt-feathers-zod schema users --set-mode zod
```

### Ajouter un champ

```bash
bunx nuxt-feathers-zod schema users --add-field "email:string!"
bunx nuxt-feathers-zod schema users --add-field "isActive:boolean=true"
```

### Renommer ou supprimer un champ

```bash
bunx nuxt-feathers-zod schema users --rename-field "name:displayName"
bunx nuxt-feathers-zod schema users --remove-field legacyCode
```

Bonne pratique : fais muter le manifest via le CLI, puis régénère. Évite de patcher à la main les fichiers générés si le service est piloté par NFZ.

## 8. Authentification

### Auth locale/JWT

Initialisation embedded avec auth :

```bash
bunx nuxt-feathers-zod init embedded --auth true --force
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --auth true
```

Configuration typique :

```ts
export default defineNuxtConfig({
  feathers: {
    auth: {
      service: 'users',
      entity: 'user',
      entityClass: 'User',
      authStrategies: ['local', 'jwt'],
      local: {
        usernameField: 'email',
        passwordField: 'password',
      },
    },
  },
})
```

Côté client :

```ts
const { login, logout, user, isAuthenticated } = useAuth()

await login({
  strategy: 'local',
  email: 'admin@example.test',
  password: 'change-me',
})

console.log(isAuthenticated.value, user.value)
await logout()
```

### Keycloak SSO

NFZ peut configurer un flux remote Keycloak en mode payload `keycloak`.

```bash
bunx nuxt-feathers-zod remote auth keycloak \
  --ssoUrl https://sso.example.com \
  --realm myrealm \
  --clientId my-nuxt-app
```

Exemple de configuration :

```ts
export default defineNuxtConfig({
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'socketio',
        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true,
        },
      },
    },

    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'myrealm',
      clientId: 'my-nuxt-app',
      onLoad: 'check-sso',
    },
  },
})
```

Bonnes pratiques :

- garder `public/silent-check-sso.html` versionné ;
- nettoyer les fragments OAuth (`state`, `code`, `session_state`) après retour SSO ;
- éviter les appels métier avant l’état `ready` du runtime auth ;
- prévoir un fallback clair en cas d’expiration de token.

## 9. Utilisation frontend

Le client est injecté dans Nuxt via le plugin NFZ.

```ts
const { $api } = useNuxtApp()

const messages = await $api.service('messages').find({
  query: {
    $limit: 20,
    $sort: { createdAt: -1 },
  },
})
```

Pour isoler l’accès Feathers dans une façade applicative :

```ts
// app/composables/useAdminFeathers.ts
export function useAdminFeathers() {
  const nuxtApp = useNuxtApp()

  const api = nuxtApp.$api
  if (!api) {
    throw new Error('NFZ client is not available')
  }

  return {
    service<T = unknown>(path: string) {
      return api.service(path) as T
    },
  }
}
```

Avec Pinia :

```ts
// app/stores/messages.ts
import { defineStore } from 'pinia'

interface Message {
  _id?: string
  text: string
  createdAt?: string
}

export const useMessagesStore = defineStore('messages', () => {
  const items = ref<Message[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      const { $api } = useNuxtApp()
      const result = await $api.service('messages').find({
        query: { $limit: 50, $sort: { createdAt: -1 } },
      })

      items.value = Array.isArray(result)
        ? result
        : result.data
    }
    finally {
      loading.value = false
    }
  }

  async function create(text: string) {
    const { $api } = useNuxtApp()
    await $api.service('messages').create({ text })
    await load()
  }

  return {
    items,
    loading,
    load,
    create,
  }
})
```

Bonne pratique : dans les pages critiques, préfère une façade (`useAdminFeathers`, store session, services applicatifs) plutôt que des appels `$api.service(...)` dispersés partout.

## 10. MongoDB management

NFZ peut activer des routes d’administration MongoDB via `feathers-mongodb-management-ts`.

```bash
bunx nuxt-feathers-zod mongo management \
  --url "mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin" \
  --auth true \
  --basePath /mongo
```

Configuration équivalente :

```ts
export default defineNuxtConfig({
  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: true,
          basePath: '/mongo',
          auth: {
            enabled: true,
            authenticate: true,
            adminRoleNames: ['admin'],
          },
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeCollectionCrud: true,
          allowInsertDocuments: false,
          allowPatchDocuments: false,
          allowRemoveDocuments: false,
        },
      },
    },
  },
})
```

Routes principales exposables :

```txt
/feathers/mongo/databases
/feathers/mongo/:db/collections
/feathers/mongo/:db/stats
/feathers/mongo/:db/:collection/indexes
/feathers/mongo/:db/:collection/count
/feathers/mongo/:db/:collection/schema
/feathers/mongo/:db/:collection/documents
/feathers/mongo/:db/:collection/aggregate
```

Bonnes pratiques :

- active l’auth sur les routes de management ;
- garde les mutations destructives désactivées par défaut ;
- utilise des allowlists de bases/collections en production ;
- isole le rôle admin de l’utilisateur applicatif standard.

## 11. Middleware, policies et server modules

### Middleware route/Nitro

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
```

### Hooks et policies Feathers

```bash
bunx nuxt-feathers-zod add middleware require-admin --target policy
bunx nuxt-feathers-zod add middleware audit-log --target hook
```

### Server modules

Les server modules permettent d’ajouter des briques d’infrastructure : CORS, Helmet, compression, body parser, healthcheck, rate-limit, fichiers statiques.

```bash
bunx nuxt-feathers-zod init embedded \
  --framework express \
  --secureDefaults true \
  --cors true \
  --compression true \
  --helmet true \
  --bodyParserJson true \
  --bodyParserUrlencoded true
```

Bonne pratique : active `secureDefaults` pour les applications exposées, puis désactive seulement ce qui est explicitement incompatible avec ton environnement.

## 12. Templates et overrides

Initialise les templates modifiables :

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates --force
```

Utilise les overrides lorsque tu dois modifier durablement le code généré par le module, sans forker NFZ.

Exemples de cas légitimes :

- stratégie d’auth custom ;
- logging applicatif imposé ;
- conventions spécifiques de transport ;
- intégration d’un SDK interne ;
- adaptation forte du bootstrap serveur.

Bonne pratique : documente chaque override dans le dépôt applicatif. Un override non documenté devient rapidement une dette de maintenance.

## 13. Swagger

Swagger est conservé comme intégration legacy et doit être activé explicitement.

```ts
export default defineNuxtConfig({
  feathers: {
    swagger: {
      enabled: true,
      docsPath: '/feathers/docs',
      specsPath: '/swagger.json',
    },
  },
})
```

Dépendances à installer côté application si nécessaire :

```bash
bun add feathers-swagger swagger-ui-dist
```

Bonne pratique : garde Swagger pour l’inspection et les équipes externes, mais considère les schémas Zod/manifest comme source interne prioritaire.

## 14. Console, builder et DevTools

Le module inclut des briques de diagnostic et de builder :

- DevTools NFZ en développement ;
- endpoints `/api/nfz/*` pour services, schema, preview, apply, manifest, RBAC ;
- pages runtime console `builder`, `init`, `rbac` ;
- logique de presets dans `src/core/presets`.

Exemple d’activation :

```ts
export default defineNuxtConfig({
  feathers: {
    devtools: true,
    console: {
      enabled: true,
      basePath: '/api/nfz',
    },
  },
})
```

Bonnes pratiques :

- garde les écritures désactivées par défaut en production ;
- sépare le builder de l’interface métier ;
- journalise les opérations `apply` ;
- protège les routes avec une politique RBAC claire.

## 15. CLI complet

Commande d’entrée :

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

Alias possible :

```bash
bunx nfz <command> [args] [--flags]
```

Commandes principales :

| Commande | Rôle |
|---|---|
| `init embedded` | Configure Feathers dans Nitro |
| `init remote` | Configure un client Feathers vers une API externe |
| `init starter` | Génère le starter Nuxt 4 + Quasar + UnoCSS + Pinia |
| `init templates` | Copie les templates pour override |
| `add service` | Génère un service embedded |
| `add file-service` | Génère un service local upload/download |
| `add remote-service` | Déclare un service distant côté client |
| `add middleware` | Génère middleware, hook, policy, module |
| `add mongodb-compose` | Génère un compose MongoDB local |
| `mongo management` | Configure les routes MongoDB management |
| `schema` | Inspecte ou modifie le schéma d’un service |
| `auth service` | Active/désactive les hooks JWT d’un service |
| `remote auth keycloak` | Configure l’auth remote Keycloak |
| `doctor` | Diagnostique la configuration projet |

### Exemples utiles

```bash
# Backend embedded minimal
bunx nuxt-feathers-zod init embedded --force

# Backend embedded avec auth
bunx nuxt-feathers-zod init embedded --auth true --force

# Service MongoDB Zod-first
bunx nuxt-feathers-zod add service users \
  --adapter mongodb \
  --collection users \
  --schema zod \
  --auth true

# Service action custom
bunx nuxt-feathers-zod add service actions \
  --custom \
  --methods find,get \
  --customMethods run,preview

# Client remote REST
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport rest \
  --force

# Service remote
bunx nuxt-feathers-zod add remote-service messages \
  --path messages \
  --methods find,get,create

# Diagnostic
bunx nuxt-feathers-zod doctor
```

## 16. Starter principal Quasar + UnoCSS + Pinia

Le starter principal fournit une base application plus proche d’un dashboard réel :

```txt
Nuxt 4
├─ Quasar 2
├─ UnoCSS
├─ Pinia
├─ NFZ embedded
├─ MongoDB docker-compose
├─ services users/messages
├─ auth locale
├─ middleware session
├─ store studioSession
└─ layout dashboard sécurisé
```

Commande :

```bash
bunx nuxt-feathers-zod init starter \
  --preset quasar-unocss-pinia-auth \
  --dir nfz-quasar-starter
```

Bonnes pratiques retenues par le starter :

- `studioSession` pilote l’état applicatif ;
- `useAdminFeathers()` centralise l’accès au client Feathers ;
- le middleware session protège les pages dashboard ;
- les stores métier encapsulent les appels CRUD ;
- le layout Quasar évite les pièges de `QDrawer` overlay.

## 17. Développement du module

Scripts importants :

```bash
bun run build
bun run typecheck
bun run test
bun run test:e2e
bun run cli:smoke
bun run smoke:tarball
bun run docs:build
```

Vérification complète :

```bash
bun run verify:all
```

Avant publication :

```bash
bun run release:check
bun run release:check:full
```

Bonnes pratiques :

- tester le tarball, pas seulement le workspace local ;
- éviter les imports ESM fragiles dans le runtime client ;
- vérifier les exports package après chaque refactor ;
- maintenir les exemples et la documentation alignés sur les commandes CLI réelles.

## 18. Dépannage rapide

### Aucun service détecté

Vérifie :

```ts
export default defineNuxtConfig({
  feathers: {
    servicesDirs: ['services'],
  },
})
```

Puis génère un service :

```bash
bunx nuxt-feathers-zod add service users --schema zod
```

### Auth embedded active mais entité introuvable

Crée d’abord le service `users` compatible auth :

```bash
bunx nuxt-feathers-zod add service users --schema zod --auth true
```

### Remote mode sans URL

Le mode remote exige une URL HTTP/HTTPS :

```ts
client: {
  mode: 'remote',
  remote: {
    url: 'https://api.example.com',
  },
}
```

### Erreurs ESM côté navigateur

Évite les imports CommonJS/default fragiles dans le runtime client servi au navigateur. Privilégie les wrappers internes ou les imports validés par les tests de packaging.

### Problèmes Windows après changement d’archive

Nettoie d’abord les artefacts :

```powershell
Remove-Item -Recurse -Force .nuxt, node_modules\.cache\vite, node_modules\.vite, node_modules, .\bun.lock -ErrorAction SilentlyContinue
bun install
bunx nuxi cleanup
```

## 19. Bonnes pratiques de conception

### Garde une séparation claire

- `services/` : contrat Feathers et logique métier côté backend ;
- `app/stores/` : état UI/applicatif ;
- `app/composables/` : façades techniques ;
- `server/feathers/modules/` : infrastructure ;
- `feathers/templates/` : overrides assumés.

### Utilise Zod pour les contrats importants

Le mode `zod` est le meilleur compromis pour les services métier durables. Il rend les entrées explicites et facilite les évolutions.

### Ne disperse pas l’accès Feathers

Dans les dashboards, évite de multiplier les appels directs dans les composants. Centralise par service applicatif, composable ou store.

### Sécurise les outils d’administration

Mongo management, builder, schema apply et endpoints `/api/nfz/*` doivent être protégés en dehors du développement local.

### Versionne les décisions

Quand tu changes un template, une convention de service ou une option sensible, documente-le dans le dépôt. NFZ facilite la génération, mais la cohérence vient des conventions de projet.

## Conclusion

`nuxt-feathers-zod` fournit un socle full-stack cohérent pour Nuxt 4 : FeathersJS v5 côté serveur ou client distant, génération CLI, validation optionnelle, auth, MongoDB, DevTools, console et starter applicatif.

Le chemin recommandé pour un nouveau projet est :

1. choisir `embedded` ou `remote` ;
2. initialiser avec le CLI ;
3. générer les services au lieu de les écrire manuellement ;
4. activer Zod sur les services durables ;
5. centraliser l’accès client dans des stores/composables ;
6. protéger toutes les routes d’administration ;
7. maintenir la documentation et les commandes CLI alignées avec le code.
