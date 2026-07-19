---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "Le backend Feathers pour Nuxt 4"
  tagline: "Créez des services full-stack typés, validés par Zod et utilisables depuis Vue en mode embedded ou remote."
  image:
    src: /images/nfz-feather.webp
    alt: Logo plume nuxt-feathers-zod
  actions:
    - theme: brand
      text: Commencer en 5 minutes
      link: /guide/getting-started
    - theme: alt
      text: Voir le playground
      link: /guide/playground
    - theme: alt
      text: Référence API
      link: /reference/

features:
  - title: "Nuxt 4 + FeathersJS"
    details: "Conservez la simplicité de Nuxt tout en structurant le backend avec des services, hooks, événements et transports Feathers."
  - title: "Validation Zod"
    details: "Validez les données, les patchs et les requêtes côté serveur avec des schémas TypeScript réutilisables."
  - title: "Embedded ou remote"
    details: "Exécutez Feathers dans Nitro ou connectez votre application à une API Feathers existante."
  - title: "Authentification modulaire"
    details: "Utilisez local/JWT, OIDC, Keycloak ou des clés API derrière un principal normalisé."
  - title: "CLI orientée projet"
    details: "Initialisez l'intégration, générez des services et contrôlez la configuration sans recopier une architecture entière."
  - title: "Playground vérifiable"
    details: "Testez le runtime, les services et l'authentification dans une interface documentée par des scénarios Playwright."
---

## Un premier service en quelques commandes

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bunx nuxt-feathers-zod init embedded --auth
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
bun dev
```

Puis utilisez le service dans un composant Vue :

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

const messages = await $api.service('messages').find({
  query: {
    $limit: 20,
    $sort: { createdAt: -1 },
  },
})
</script>

<template>
  <pre>{{ messages }}</pre>
</template>
```

## Le playground montre le résultat réel

Les captures sont générées depuis le playground après réussite des assertions Playwright. Elles servent à comprendre le module, pas à documenter le processus interne de développement.

![Tableau de bord du playground nuxt-feathers-zod](/images/guides/playwright/playwright-dashboard.png)

[Installer le module](/guide/getting-started) · [Choisir un mode](/guide/modes) · [Créer un service](/guide/services)

## Projet

- [Package npm](https://www.npmjs.com/package/nuxt-feathers-zod)
- [Dépôt GitHub](https://github.com/vevedh/nuxt-feathers-zod)

<!-- release-version: 6.6.0 -->
