# nuxt-feathers-zod

### Guide officiel d’initialisation – Nuxt 4 (Bun, Feathers v5, Zod)

Ce guide décrit **la seule procédure valide et supportée** pour initialiser correctement **nuxt-feathers-zod** dans un projet **Nuxt 4**, en se basant **strictement sur le comportement réel du module**.

Il évite volontairement toute “magie implicite” ou création manuelle non supportée.

---

## 1. Objectif du module

`nuxt-feathers-zod` permet d’embarquer un **backend FeathersJS v5 (Dove)** directement dans **Nitro**, avec :

* API REST (`/feathers/*`)
* WebSocket (Socket.IO)
* Validation **Zod-first**
* Authentification **Local + JWT**
* Adapters (MongoDB, Memory, etc.)
* Swagger legacy (optionnel)
* Composables client (`useService`, `useAuth`, stores Pinia)

👉 Il **n’y a pas de backend séparé** : Feathers est monté **dans Nuxt**.

---

## 2. Pré-requis

* **Bun** (recommandé et supporté)
* **Node.js ≥ 18**
* **Nuxt 4**
* MongoDB (optionnel mais recommandé)

---

## 3. Création du projet Nuxt 4

```bash
bunx nuxi@latest init my-site
cd my-site
bun install
bun run dev
```

➡️ Vérifie que Nuxt démarre **avant toute intégration Feathers**.

---

## 4. Installation des dépendances

### 4.1 Module principal

```bash
bun add nuxt-feathers-zod feathers-pinia
```

### 4.2 (Optionnel) Swagger legacy

```bash
bun add feathers-swagger swagger-ui-dist
```

> ⚠️ `swagger-ui-dist` est requis si `feathers.swagger = true`

---

## 5. Configuration **obligatoire** (`nuxt.config.ts`)

> ⚠️ **Cette configuration est critique**.
> Une mauvaise initialisation provoque des erreurs bloquantes au démarrage.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    /**
     * RÈGLE D’OR :
     * Le module scanne UNIQUEMENT ces dossiers
     */
    servicesDirs: ['services'],

    /**
     * Transports
     */
    transports: {
      rest: {
        path: '/feathers',
        framework: 'koa',
      },
      websocket: true,
    },

    /**
     * Base de données (MongoDB recommandé)
     */
    database: {
      mongo: {
        url: 'mongodb://127.0.0.1:27017/my-site',
      },
    },

    /**
     * Authentification
     */
    auth: true,

    /**
     * Swagger legacy (optionnel)
     */
    swagger: false,
  },
})
```

---

## 6. RÈGLE FONDAMENTALE – À NE JAMAIS VIOLER

> ❌ **Ne jamais créer un service manuellement**
> ✅ **Toujours utiliser la CLI officielle**

Cette règle est **imposée par le code interne du module**.

---

## 7. Création du premier service : `users` (OBLIGATOIRE)

```bash
bunx nuxt-feathers-zod add service users \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

### Structure générée (attendue)

```
services/users/
  users.ts
  users.class.ts
  users.schema.ts
  users.shared.ts
```

### Pourquoi `users` est obligatoire ?

* Le module **résout l’authentification** via une `entityClass` nommée **`User`**
* Cette classe est **recherchée dynamiquement** dans les exports scannés
* Sans ce service :

  * `Services typeExports []`
  * `Entity class User not found in services imports`
  * **Boot impossible**

👉 Le service `users` est la **clé de voûte** de tout projet `nuxt-feathers-zod`.

---

## 8. Création d’un service métier (exemple : `articles`)

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

Structure :

```
services/articles/
  articles.ts
  articles.class.ts
  articles.schema.ts
  articles.shared.ts
```

---

## 9. Démarrage et tests REST

```bash
bun run dev
```

### 9.1 Création d’un utilisateur

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

### 9.2 Authentification

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

### 9.3 Accès à un service protégé

```bash
curl http://localhost:3000/feathers/articles \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 10. Swagger legacy (optionnel)

### 10.1 Activer Swagger

```ts
feathers: {
  swagger: true,
}
```

### 10.2 Accès

* UI :
  `http://localhost:3000/feathers/docs/`
* Spec :
  `http://localhost:3000/feathers/swagger.json`

### ⚠️ Important

Dans l’UI Swagger, la spec doit être définie manuellement à :

```
../swagger.json
```

(C’est un comportement connu et assumé du module.)

---

## 11. Plugins serveur Feathers (seed, hooks globaux)

### Exemple : `server/feathers/dummy.ts`

```ts
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  app.hooks({
    setup: [
      async (context, next) => {
        await context.app.service('users').create({
          userId: 'admin',
          password: 'admin123',
        })
        await next()
      },
    ],
  })
})
```

➡️ Ces fichiers sont des **plugins Feathers**, pas des services.

---

## 12. Erreurs courantes et causes réelles

### ❌ `Services typeExports []`

Causes :

* `servicesDirs` incorrect
* services créés manuellement
* fichiers mal nommés (`users.ts` manquant)

### ❌ `Entity class User not found in services imports`

Cause exacte :

* le service `users` n’existe pas ou n’a pas été généré via la CLI

✅ Solution universelle :

```bash
bunx nuxt-feathers-zod add service users
```

---

## 13. Bonnes pratiques figées

* ✅ **Toujours** générer les services avec la CLI
* ✅ `services/<name>/<name>.ts` obligatoire
* ✅ Zod-first (`*.schema.ts`)
* ❌ Pas de création manuelle
* ❌ Pas de renommage arbitraire de `User`
* ❌ Pas de déplacement hors `servicesDirs`

---

## 14. Résumé express (checklist)

1. `bunx nuxi init`
2. `bun add nuxt-feathers-zod feathers-pinia`
3. `servicesDirs: ['services']`
4. `bunx nuxt-feathers-zod add service users`
5. `bunx nuxt-feathers-zod add service <business>`
6. `bun run dev`
