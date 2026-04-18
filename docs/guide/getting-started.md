---
editLink: false
---
# Démarrage rapide

`nuxt-feathers-zod` intègre **FeathersJS v5 (Dove)** dans **Nuxt 4 / Nitro** et fournit un socle déjà avancé pour construire soit :

- une API **embedded** dans ton projet Nuxt,
- un frontend Nuxt connecté à une API Feathers **remote**,
- ou une configuration hybride avec **authentification locale, JWT et Keycloak SSO**.

Le module est pensé **CLI-first** : la manière supportée de démarrer et de générer les artefacts est d’utiliser `bunx nuxt-feathers-zod ...`.

## Quickstart en 5 commandes

Si tu veux le chemin supporté le plus court, fais d'abord ceci :

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```


## Quickstart upload/download local

```bash
bunx nuxi@latest init my-nfz-files
cd my-nfz-files
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
bun dev
```

## Ce que le module sait déjà faire

Aujourd’hui, le socle stable couvre déjà les fonctions suivantes :

- **mode embedded** : Feathers tourne dans Nitro,
- **mode remote** : client Feathers vers une API externe,
- **REST** et **Socket.IO**,
- serveur embedded **Express** ou **Koa**,
- génération CLI de **services standard**,
- génération CLI de **services sans adapter** avec **méthodes custom**,
- enregistrement de **services distants** côté client,
- auth **locale/JWT**,
- auth **Keycloak SSO**,
- support **feathers-pinia** côté client,
- **Swagger legacy** en option,
- **template overrides** pour surcharger les templates générés,
- **server modules** embedded (CORS, helmet, compression, body-parser, serve-static, rate-limit, healthcheck),
- **presets server-module** Express via la CLI,
- **bootstrap MongoDB local** via `add mongodb-compose`,
- **activation/désactivation des hooks auth** d’un service existant via `auth service`,
- **MongoDB management** optionnel via `database.mongo.management`,
- playground de validation pour les scénarios embedded / remote.

## Pré-requis

- **Bun** recommandé
- **Node.js 18+**
- **Nuxt 4**

## Philosophie recommandée

Deux règles sont importantes :

1. **Ne pas créer les services manuellement au début**.
2. **Toujours initialiser le module puis générer les services avec la CLI**.

C’est la méthode la plus sûre pour éviter les problèmes de scan, d’exports, d’entité auth, de templates ou de hooks incohérents.

---

## Parcours recommandé n°1 : démarrer en mode embedded

C’est le meilleur point d’entrée pour découvrir le module.

### 1) Créer une application Nuxt 4

```bash
bunx nuxi@latest init my-app
cd my-app
bun install
```

### 2) Installer le module

```bash
bun add nuxt-feathers-zod feathers-pinia
```

Optionnel, si tu veux exposer la documentation Swagger legacy :

```bash
bun add feathers-swagger swagger-ui-dist
```

Si tu utilises Pinia côté app, ajoute aussi :

```bash
bun add -D @pinia/nuxt
```

Puis active `@pinia/nuxt` dans `modules` si ton app ne l’active pas déjà.

### 3) Initialiser le mode embedded

```bash
bunx nuxt-feathers-zod init embedded --force
```

Cette commande prépare une configuration minimalement cohérente pour :

- charger `nuxt-feathers-zod` dans `modules`,
- configurer `feathers.servicesDirs`,
- activer un serveur embedded,
- préparer REST et WebSocket,
- patcher `nuxt.config.ts` quand sa structure reste standard.

### 4) Générer ton premier service

```bash
bunx nuxt-feathers-zod add service users
```

Tu peux aussi générer directement un service MongoDB :

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id
```

### 5) Lancer l’application

```bash
bun run dev
```

### 6) Tester rapidement

Endpoints typiques :

- `GET http://localhost:3000/feathers/users`
- `POST http://localhost:3000/feathers/users`

---

## Parcours recommandé n°2 : embedded avec auth locale

Si tu veux un vrai socle applicatif avec authentification locale :

### 1) Initialiser embedded + auth

```bash
bunx nuxt-feathers-zod init embedded --force --auth
```

### 2) Générer le service `users`

```bash
bunx nuxt-feathers-zod add service users --auth
```

Pour MongoDB :

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id --auth --docs
```

### 3) Démarrer

```bash
bun run dev
```

Selon ta config, les endpoints d’auth sont exposés sous le préfixe REST du module, par défaut :

- `POST /feathers/authentication`
- `GET /feathers/users`

> En mode auth local, la génération du service `users` via la CLI n’est pas juste pratique : c’est la voie recommandée pour garder une résolution correcte de l’entité auth et des fichiers associés.

---

## Parcours recommandé n°3 : frontend Nuxt vers API Feathers distante

Le mode remote permet d’utiliser le module comme client Feathers typé et cohérent, sans embarquer le serveur Feathers dans Nitro.

### 1) Initialiser le mode remote

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio
```

Exemple REST :

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest
```

### 2) Déclarer les services distants utiles

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bunx nuxt-feathers-zod add remote-service articles --path articles --methods find,get
```

### 3) Démarrer Nuxt

```bash
bun run dev
```

Le runtime client lit ensuite la configuration remote exposée dans `runtimeConfig.public._feathers`.

---

## Starter upload/download de fichiers

NFZ fournit aussi un scaffold CLI dédié pour un service local d'upload/download de fichiers :

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

Ce starter génère un service sans adapter avec `find`, `get`, `remove`, `upload` et `download`. Tous les détails sont dans [Service d'upload/download de fichiers](/guide/file-upload-download).

## Générer un service sans adapter avec méthodes custom

Le module sait aussi générer un **service sans adapter**, utile pour :

- des actions métier,
- des exécutions de job,
- des endpoints contrôlés,
- des façades SSR-safe / transport-agnostic.

Commande recommandée :

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

Ce mode remplace désormais l’ancien réflexe `add custom-service` dans la documentation publique.

---

## Exemple minimal de configuration manuelle

La CLI est recommandée, mais voici une configuration de base cohérente si tu veux comprendre la structure cible :

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],

    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: true,
    },

    auth: true,
    swagger: false,

    client: {
      mode: 'embedded',
      pinia: true,
    },
  },
})
```

Pour MongoDB, ajoute la configuration base de données adaptée à ton projet.

---

## Fonctions avancées déjà disponibles

Quand le socle de base fonctionne, tu peux activer progressivement :

- **template overrides** : surcharger les templates générés,
- **Swagger legacy** : exposer une doc OpenAPI/Swagger UI,
- **Keycloak SSO** : flux SSO côté frontend,
- **server modules** : composer ton pipeline serveur embedded,
- **Koa** à la place d’Express,
- **services remote** supplémentaires,
- **playground** de validation des scénarios embedded/remote.

Pages utiles ensuite :

- [CLI](./cli)
- [Modes](./modes)
- [Services](./services)
- [Services sans adapter](./custom-services)
- [Auth locale](./auth-local)
- [Keycloak SSO](./keycloak-sso)
- [Swagger](./swagger)
- [Template overrides](./template-overrides)

---

## Ce que je recommande de considérer comme “stable”

Pour stabiliser le module avant d’aller plus loin, je recommande de considérer comme **cœur standard** :

- embedded,
- remote,
- REST,
- Socket.IO,
- Express / Koa,
- génération `add service`,
- génération `add service --custom`,
- `add remote-service`,
- auth locale/JWT,
- Keycloak SSO déjà existant,
- Swagger legacy,
- template overrides,
- server modules standard,
- support Pinia / feathers-pinia,
- commandes `doctor`, `init embedded`, `init remote`, `init templates`.

---

## Ce qui ferait de bons modules sous licence plus tard

Pour garder un noyau open source stable et vendre des fonctions avancées sous forme de **licence key**, les meilleures candidates sont plutôt :

- **console visuelle pro** (builder, init wizard, diagnostics enrichis),
- **RBAC avancé** avec policies prêtes à l’emploi,
- **presets métier** complets (SaaS, admin, multitenant, back-office),
- **DevTools NFZ** enrichis,
- **licensing / billing integration**,
- **remote discovery sécurisé**,
- **génération de stacks backend/front complètes**, 
- **scaffolds enterprise** (Keycloak avancé, audit, monitoring, observabilité),
- **packs de templates premium**, 
- **assistants de migration / doctor avancé**.

L’idée générale :

- **open source stable** = runtime, CLI, génération de base, auth de base, docs, modes,
- **sous licence** = productivité premium, UI admin, automation, packs métier, diagnostics avancés, intégrations enterprise.
