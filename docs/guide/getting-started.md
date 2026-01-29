# Démarrage rapide

Ce module embarque **FeathersJS v5 (Dove)** dans **Nuxt 4 / Nitro**. Tu obtiens une API (REST et/ou WebSocket) dans le même projet.

## Pré-requis

- Bun (recommandé)
- Node.js ≥ 18
- Nuxt 4

## 1) Créer une app Nuxt 4

```bash
bunx nuxi@latest init my-site
cd my-site
bun install
bun run dev
```

## 2) Installer le module

```bash
bun add nuxt-feathers-zod feathers-pinia
```

Swagger (legacy) (optionnel) :

```bash
bun add feathers-swagger swagger-ui-dist
```

## 3) Config minimale (obligatoire)

Dans `nuxt.config.ts` :

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    // IMPORTANT : le module scanne uniquement ces dossiers.
    servicesDirs: ['services'],

    transports: {
      rest: {
        path: '/feathers',
        framework: 'koa',
      },
      websocket: true,
    },

    database: {
      mongo: {
        url: 'mongodb://127.0.0.1:27017/my-site',
      },
    },

    auth: true,
    swagger: false,
  },
})
```

## 4) Règle d’or : ne jamais créer un service manuellement

Les services doivent être **générés** pour que :

- les exports/types soient détectés,
- l’entity `User` soit résolue correctement,
- les hooks Zod soient câblés de façon cohérente.

## 5) Générer le premier service `users` (obligatoire en mode auth locale)

```bash
bunx nuxt-feathers-zod add service users \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

Puis démarrer :

```bash
bun run dev
```

Ton API REST est disponible sous :

- `http://localhost:3000/feathers/*`

Prochaine étape : créer un service métier (`articles`).
