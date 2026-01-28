Parfait.
Voici **toutes les étapes, strictement dans l’ordre**, **sans digression**, **alignées à 100 % sur le code réel du module nuxt-feathers-zod**.
C’est **la séquence officielle à suivre**, du projet Nuxt 4 vierge jusqu’à une API fonctionnelle.

---

# Initialisation officielle de **nuxt-feathers-zod**

## Nuxt 4 – Ordre strict des actions

---

## ÉTAPE 1 — Créer le projet Nuxt 4 (base saine)

```bash
bunx nuxi@latest init my-site
cd my-site
bun install
bun run dev
```

✅ Objectif

* Vérifier que **Nuxt 4 démarre sans erreur**
* Ne **rien installer d’autre** tant que cette étape n’est pas validée

---

## ÉTAPE 2 — Installer le module nuxt-feathers-zod

```bash
bun add nuxt-feathers-zod feathers-pinia
```

➡️ Ces dépendances doivent être **au niveau racine** du projet.

---

## ÉTAPE 3 — (Optionnel) Installer Swagger legacy

À faire **uniquement si tu veux `/feathers/docs`** :

```bash
bun add feathers-swagger swagger-ui-dist
```

---

## ÉTAPE 4 — Configurer `nuxt.config.ts` (OBLIGATOIRE)

Créer ou modifier **immédiatement** `nuxt.config.ts` :

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    /**
     * OBLIGATOIRE
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

❗ Cette étape **doit être faite avant toute création de service**.

---

## ÉTAPE 5 — Créer le service `users` (ÉTAPE CRITIQUE)

> ⚠️ **NE JAMAIS créer `users` manuellement**

```bash
bunx nuxt-feathers-zod add service users \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

### Résultat attendu

```
services/users/
  users.ts
  users.class.ts
  users.schema.ts
  users.shared.ts
```

### Pourquoi cette étape est obligatoire

* Le module cherche **une entity `User` dans les exports**
* Sans ce service :

  * `Services typeExports []`
  * `Entity class User not found in services imports`
  * **Boot impossible**

---

## ÉTAPE 6 — Créer les services métier (exemple : `articles`)

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

Structure générée automatiquement :

```
services/articles/
  articles.ts
  articles.class.ts
  articles.schema.ts
  articles.shared.ts
```

---

## ÉTAPE 7 — Démarrer Nuxt avec Feathers intégré

```bash
bun run dev
```

À ce stade :

* Nitro démarre
* Feathers est monté
* REST actif sous `/feathers`
* Auth activée
* MongoDB connecté

---

## ÉTAPE 8 — Test API (validation obligatoire)

### 8.1 Créer un utilisateur

```bash
curl -X POST http://localhost:3000/feathers/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"demo","password":"demo123"}'
```

---

### 8.2 Authentification

```bash
curl -X POST http://localhost:3000/feathers/authentication \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","userId":"demo","password":"demo123"}'
```

➡️ Récupérer le `accessToken`.

---

### 8.3 Appeler un service protégé

```bash
curl http://localhost:3000/feathers/articles \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## ÉTAPE 9 — (Optionnel) Activer Swagger legacy

### 9.1 Activer dans `nuxt.config.ts`

```ts
feathers: {
  swagger: true,
}
```

Redémarrer :

```bash
bun run dev
```

---

### 9.2 Accès Swagger

* UI
  👉 `http://localhost:3000/feathers/docs/`
* Spec
  👉 `http://localhost:3000/feathers/swagger.json`

⚠️ Dans l’UI Swagger, définir la spec à :

```
../swagger.json
```

---

## ÉTAPE 10 — (Optionnel) Ajouter un plugin Feathers serveur (seed)

Créer :

```
server/feathers/dummy.ts
```

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

➡️ Utilisé pour :

* seed
* hooks globaux
* logique serveur transversale

---

## ÉTAPE 11 — Checklist finale (doit être vraie à 100 %)

* ✅ `servicesDirs = ['services']`
* ✅ Service `users` généré via CLI
* ✅ Aucun service créé à la main
* ✅ `users.schema.ts` exporte `User`
* ✅ API accessible sous `/feathers`
* ✅ Auth fonctionnelle
* ✅ MongoDB connecté

---

## RÉSUMÉ ABSOLU (ordre non négociable)

1. `bunx nuxi init`
2. `bun add nuxt-feathers-zod feathers-pinia`
3. config `nuxt.config.ts`
4. `bunx nuxt-feathers-zod add service users`
5. `bunx nuxt-feathers-zod add service <metier>`
6. `bun run dev`
7. tests REST
8. (optionnel) Swagger
9. (optionnel) plugins Feathers

