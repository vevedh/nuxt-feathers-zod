# nuxt-feathers-zod

> **Nuxt 4 (Nitro) + FeathersJS v5 (Dove) + Zod** — un module “tout‑en‑un” (site + API) avec **CLI**.

`nuxt-feathers-zod` embarque un **backend Feathers** dans une app **Nuxt 4**. Tu construis une app web **et** une API dans le même projet, avec :

- ✅ Services **Zod-first** (validation `data`/`query` + types)
- ✅ REST sous un préfixe (par défaut `/feathers`) via **Koa** ou **Express**
- ✅ Client DX : `useService()` + stores Pinia (via `feathers-pinia`)
- ✅ Swagger legacy (optionnel)
- ✅ **Keycloak-only SSO** (optionnel) : `check-sso` ou `login-required` via `onLoad`
- ✅ Composable unifié **`useAuth()`** (optimisation) : même API en Keycloak-only ou auth locale

---

## TL;DR (Nuxt 4)

1. Installer :

```bash
bun add nuxt-feathers-zod feathers-pinia
```

2. Configurer Nuxt :

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    // RÈGLE D’OR : le module scanne uniquement ces dossiers
    servicesDirs: ['services'],

    transports: {
      rest: { path: '/feathers', framework: 'koa' },
      websocket: true,
    },

    database: {
      mongo: { url: 'mongodb://127.0.0.1:27017/my-site' },
    },

    // Auth locale (JWT) — OU Keycloak-only (voir plus bas)
    auth: true,

    // Swagger legacy (optionnel)
    swagger: { enabled: false },
  },
})
```

3. Générer les services **via la CLI** (ne pas créer à la main) :

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --auth --idField _id --docs
bunx nuxt-feathers-zod add service articles --adapter mongodb --auth --idField _id --docs
```

---

## Prérequis

- **Bun** (recommandé)
- Node.js ≥ 18
- Nuxt 4

---

## Installation

```bash
bun add nuxt-feathers-zod feathers-pinia
```

### Swagger legacy (optionnel)

```bash
bun add feathers-swagger swagger-ui-dist
```

> Si `feathers.swagger.enabled = true` mais que `feathers-swagger` n’est pas installé dans l’app Nuxt, le module affiche un warning DX au démarrage.

---

## Règle fondamentale : services générés uniquement via CLI

✅ Toujours :

```bash
bunx nuxt-feathers-zod add service <name> ...
```

❌ Ne pas créer manuellement `services/<name>`.

Pourquoi : le module génère les imports/types à partir de `servicesDirs`. Si un service n’est pas généré selon la structure attendue, tu peux déclencher des erreurs du type :

- `Services typeExports []`
- `Entity class User not found`

---

## Configuration Nuxt

### Options essentielles

- `feathers.servicesDirs` : **obligatoire**
- `feathers.transports.rest.path` : préfixe REST (ex `/feathers`)
- `feathers.database.mongo.url` : MongoDB (si adapter mongodb)

---

## Auth : concept important (ne pas mélanger)

Le module supporte 2 approches :

1. **Auth locale Feathers (JWT)** : `feathers.auth = true` + service `users` + endpoint `/feathers/authentication`.
2. **Keycloak-only SSO** : `feathers.keycloak = { ... }` + plugin client `keycloak-js`, pas de login Feathers.

👉 Ces deux providers ne partagent pas le même token ni la même session. C’est la raison pour laquelle on a ajouté **`useAuth()`** : une seule API côté frontend.

---

## `useAuth()` : API unifiée (recommandé)

### Pourquoi ?

- En Keycloak-only, `useAuthStore()` (auth locale) n’est pas initialisé.
- En auth locale, `$keycloak` n’existe pas.
- Mélanger les deux dans la même page revient à avoir **deux sources de vérité** et des headers `Authorization` concurrents.

### Usage

```ts
const auth = useAuth()
await auth.init()

if (!auth.isAuthenticated.value) {
  await auth.login()
}

console.log(auth.provider.value) // 'keycloak' | 'local' | 'none'
console.log(auth.user.value)
```

> ⚠️ Attention : `feathers-pinia` expose aussi un `useAuth`. Évite d’importer `useAuth` depuis `feathers-pinia` dans une app Nuxt utilisant `nuxt-feathers-zod`. Si tu en as besoin, importe-le avec alias :
>
> ```ts
> import { useAuth as useFeathersAuth } from 'feathers-pinia'
> ```

---

## Auth locale (Local + JWT)

### 1) Générer `users` (obligatoire)

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --auth --idField _id --docs
```

### 2) Tests REST

Créer un utilisateur :

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

Login :

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

Appel protégé :

```bash
curl http://localhost:3000/feathers/articles \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## Keycloak-only SSO (Option A)

### Objectif

- Au démarrage : `check-sso` (pas de redirection forcée)
- Routes protégées : middleware Nuxt qui appelle `login()` seulement quand nécessaire

### Configuration Nuxt

```ts
export default defineNuxtConfig({
  feathers: {
    // active le mode Keycloak-only
    keycloak: {
      serverUrl: 'https://svrkeycloak.agglo.local:8443',
      realm: 'AGGLO',
      clientId: 'nuxt4app',

      // Option ajoutée : onLoad
      onLoad: 'check-sso', // ou 'login-required'

      // bridge service Feathers (whoami)
      authServicePath: '/_keycloak',

      // si tu veux une persistance user : userService + serviceIdField
      userService: 'users',
      serviceIdField: 'keycloakId',

      permissions: false,
    },
  },
})
```

### Fichier requis pour `check-sso`

Créer : `public/silent-check-sso.html`

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

### Les services Feathers protégés fonctionnent-ils ?

✅ Oui, si :

- côté client, le plugin Keycloak injecte `Authorization: Bearer <kc_token>` dans les appels Feathers
- côté serveur, le hook Keycloak valide le JWT (JWKS) et remplit `context.params.user`

---

## Frontend : `useService()` (feathers-pinia)

Exemple : liste d’articles :

```vue
<script setup lang="ts">
import { useService } from 'feathers-pinia'

const { data, find, isPending } = useService('articles')

await find({ query: { $limit: 10 } })
</script>

<template>
  <div>
    <div v-if="isPending">
      Chargement…
    </div>
    <pre v-else>{{ data }}</pre>
  </div>
</template>
```

---

## Swagger legacy

- UI : `/feathers/docs/`
- Spec : `/feathers/swagger.json` (souvent consommée via `../swagger.json` depuis l’UI)

---

## Playground (monorepo)

### Windows / ESM

Référencer toujours le module avec extension :

```ts
modules: ['../src/module.ts']
```

### vue-tsc / vite-plugin-checker

Si tu vois :

- `Cannot find global type 'Array'` / `lib.dom.d.ts not found`

Alors désactive le typecheck dans le playground :

```ts
typescript: { typeCheck: false }
```

Et garde le typecheck au root via un script dédié.

---

## Documentation (VitePress)

Lancer la doc :

```bash
bun run docs:dev
```

---

## Scripts utiles

- `bun run dev` : lance le playground
- `bun run prepare` : build du module (`nuxt-module-build prepare && build`)
- `bun run docs:dev` : doc VitePress
