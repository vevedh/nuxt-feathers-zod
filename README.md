# nuxt-feathers-zod

Nuxt 4 module that embeds a **FeathersJS v5 (Dove)** server directly into **Nitro** and exposes Feathers services to your Nuxt application, with **Zod-first validation** and an optional **Swagger (legacy) integration**.

This module lets you run Feathers **without a separate backend process**, while keeping strong typing, shared schemas, and a clean DX.

---

## ✨ Features

- FeathersJS v5 (Dove) running **inside Nitro**
- REST transport (Koa or Express)
- Optional Socket.io transport (WebSocket)
- **Zod schemas** for data + query validation (server-side)
- Typed Feathers client injected into Nuxt (`$api`)
- Optional Pinia integration via `feathers-pinia`
- CLI to generate services and middleware
- **Swagger UI (legacy)** support via `feathers-swagger`

---

## 📦 Requirements

- Node.js **18+** (or **Bun** recommended)
- Nuxt **4**
- FeathersJS **v5 (Dove)**

---

## 🚀 Using nuxt-feathers-zod in a new Nuxt 4 project (step by step)

This section explains **from zero** how to use `nuxt-feathers-zod` in a fresh Nuxt 4 project.

---

## 1️⃣ Create a new Nuxt 4 project

```bash
bunx nuxi@latest init my-nuxt-feathers-app
cd my-nuxt-feathers-app
bun install
```

Run once to verify:

```bash
bun run dev
```

---

## 2️⃣ Install nuxt-feathers-zod

```bash
bun add nuxt-feathers-zod feathers-pinia
```

(Optional – for Swagger legacy support)

```bash
bun add feathers-swagger
```

---

## 3️⃣ Enable the module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
})
```

At this point, Nuxt will start with an **embedded FeathersJS server inside Nitro**.

---

Parfait 👍
Voici un **bloc prêt à intégrer dans ton `README.md`**, qui :

1. **explique précisément le rôle de `playground/server/feathers/dummy.ts`**
2. **explique pourquoi le premier service à créer doit être `users`**
3. **donne le raisonnement Feathers + Auth + Swagger + DX**

Tu peux l’insérer tel quel (par exemple après la section _Minimal Feathers configuration_).

---

## 🧪 Playground – rôle du fichier `playground/server/feathers/dummy.ts`

Le fichier :

```ts
playground / server / feathers / dummy.ts
```

est **volontairement simple** et joue un rôle fondamental dans le module `nuxt-feathers-zod`.

### 🎯 Objectif principal

👉 **Fournir un backend Feathers minimal mais fonctionnel**, utilisable immédiatement dans le playground Nuxt, sans dépendre d’un vrai projet métier.

Il permet de :

- vérifier que **Feathers démarre correctement dans Nitro**
- valider le **routing REST** (`/feathers/*`)
- tester **Swagger UI**
- servir de **service de test (smoke test)** pour le module

---

### 🧩 Que fait concrètement `dummy.ts` ?

Typiquement, ce fichier :

- crée une application Feathers
- enregistre **au moins un service**
- expose une route REST simple (ex: `/dummy`)
- ne dépend pas d’authentification ni de base de données

Exemple conceptuel :

```ts
export function dummy(app: Application) {
  app.use('dummy', {
    async find() {
      return [{ ok: true }]
    },
  })
}
```

Ce service permet de tester immédiatement :

```bash
curl http://localhost:3000/feathers/dummy
```

---

### 🧠 Pourquoi ce fichier est important ?

Sans `dummy.ts` :

- Feathers démarre **sans aucun service**
- Swagger UI peut être vide ou trompeur
- les tests d’intégration sont plus complexes
- le playground ne démontre rien visuellement

👉 **`dummy.ts` est un point d’ancrage pédagogique et technique**, pas un service métier.

---

## 👤 Pourquoi créer immédiatement un service `users` (et pas un autre) ?

Dans un projet Feathers **avec authentification**, le **premier vrai service à créer doit toujours être `users`**.

Ce n’est **pas un choix arbitraire**.

---

### 🔐 Raison n°1 — Feathers Auth repose sur `users`

Le système d’authentification Feathers (v5 Dove) repose sur :

- le service **`authentication`**
- une **stratégie locale ou JWT**
- un **service utilisateur** (`users`)

➡️ **Sans service `users`**, ces endpoints ne peuvent pas fonctionner :

```http
POST /feathers/authentication
POST /feathers/users
```

---

### 🔑 Raison n°2 — `users` est la source de vérité sécurité

Le service `users` contient :

- les identifiants (email, username, etc.)
- le mot de passe hashé
- les rôles (`admin`, `editor`, etc.)
- les règles d’accès (RBAC)

C’est sur `users` que reposent ensuite :

- `authenticate('jwt')`
- `requireRole(...)`
- les hooks de sécurité
- Swagger `securitySchemes`

---

### 🧠 Raison n°3 — Swagger dépend fortement de `users`

Si tu actives Swagger (`feathers.swagger = true`) :

- le **flux d’authentification JWT** est documenté
- le bouton **Authorize** apparaît
- les routes sécurisées sont visibles

👉 **Sans `users`, Swagger est incomplet ou trompeur**.

---

### 🧪 Raison n°4 — DX et tests automatisés

Dans `nuxt-feathers-zod`, le service `users` permet :

- de tester immédiatement :

  ```bash
  curl -X POST /feathers/users
  curl -X POST /feathers/authentication
  ```

- de valider :
  - JWT
  - guards
  - hooks
  - swagger.json

- d’avoir un **socle stable pour tous les autres services**

---

## ✅ Ordre recommandé des services dans un projet Nuxt + Feathers

Toujours respecter cet ordre :

1. **`dummy`** (playground / smoke test)
2. **`users`** ← indispensable
3. `authentication` (auto-géré)
4. services métier (`articles`, `projects`, `tickets`, etc.)

---

## 🧭 Résumé

- `dummy.ts` :
  - service minimal
  - sert de **preuve de fonctionnement**
  - facilite debug, Swagger et onboarding

- `users` :
  - **service fondamental**
  - requis pour l’authentification
  - point central de la sécurité
  - base de Swagger, JWT et RBAC

👉 **Sans `users`, un projet Feathers n’est pas réellement exploitable.**

## 4️⃣ Minimal Feathers configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],

    transports: {
      rest: {
        path: '/feathers',
        framework: 'koa',
      },
    },

    database: {
      mongo: {
        url: 'mongodb://127.0.0.1:27017/nuxt-feathers-zod',
      },
    },
  },
})
```

Start Nuxt:

```bash
bun run dev
```

Test:

```bash
curl http://localhost:3000/feathers
```

---

## 5️⃣ Generate your first service

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

This generates:

```
services/articles/
├─ articles.class.ts
├─ articles.schema.ts
├─ articles.ts
└─ articles.shared.ts
```

---

## 6️⃣ Example: Articles service (server)

```ts
// services/articles/articles.ts
export function articles(app: Application) {
  app.use('articles', new ArticlesService(getOptions(app)), {
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    docs: {
      description: 'Articles API',
      idType: 'string',
    },
  })
}
```

---

## 7️⃣ Use the service in Nuxt (client)

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

const articles = await $api.service('articles').find()
</script>

<template>
  <pre>{{ articles }}</pre>
</template>
```

---

## 8️⃣ Authentication example

Create a user:

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

Authenticate:

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

Use JWT:

```bash
curl http://localhost:3000/feathers/articles \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 9️⃣ Swagger (legacy) – complete example

Enable Swagger:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  feathers: {
    swagger: true,
  },
})
```

Access:

- UI: http://localhost:3000/feathers/docs/
- Spec: http://localhost:3000/feathers/swagger.json

⚠️ In Swagger UI, **replace `/swagger.json` with `../swagger.json`**.

---

## 🔟 Project layout recap

```
my-nuxt-feathers-app/
├─ app/
├─ server/
├─ services/
│  └─ articles/
├─ nuxt.config.ts
└─ package.json
```

---

## 🧠 Credits

Inspired by:

- https://github.com/GaborTorma/feathers-nitro-adapter
- FeathersJS v5 (Dove)

---

## ✅ Status

**Stable – reference version frozen**
