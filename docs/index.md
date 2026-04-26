---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt 4"
  tagline: "Un module Nuxt backend-first pour embarquer Feathers dans Nitro ou connecter un client Feathers à une API distante, avec un workflow CLI-first propre à publier et maintenir."
  image:
    light: /nuxt-feathers-zod/images/plume-light.svg
    dark: /nuxt-feathers-zod/images/plume-dark.svg
    alt: Logo plume
  actions:
    - theme: brand
      text: Démarrage rapide
      link: /guide/getting-started
    - theme: alt
      text: Référence CLI
      link: /reference/cli
    - theme: alt
      text: Publication npm & Git
      link: /guide/publishing

features:
  - title: "Deux modes, un seul workflow"
    details: "Embedded pour faire tourner Feathers dans Nitro, remote pour consommer une API Feathers externe avec un client typé."
  - title: "CLI-first"
    details: "Initialisation, services, remote services, middleware et server modules sont générés de façon déterministe."
  - title: "Zod-first en option"
    details: "Schémas Zod, validation query/data et types partagés quand tu en as besoin, sans l’imposer partout."
  - title: "Auth réelle"
    details: "Auth locale/JWT, compatibilité Keycloak SSO et runtime auth outillé côté client."
  - title: "Packaging sérieux"
    details: "Build, typecheck, E2E et smoke tarball font partie de la discipline publique du module."
  - title: "Prêt pour la communauté"
    details: "Docs FR/EN, workflow de contribution, checklist de release et dépôt nettoyé pour la publication."
---

## Commence ici

Choisis le parcours qui correspond à ton besoin principal :

- **Découvrir NFZ en 5 minutes** → [Démarrage rapide](/guide/getting-started)
- **Créer un backend Feathers embarqué dans Nuxt** → [Modes embedded/remote](/guide/modes)
- **Brancher un frontend Nuxt sur une API Feathers distante** → [Mode remote](/guide/remote)
- **Publier ou maintenir le module OSS** → [Publication npm & Git](/guide/publishing)

## Ce que NFZ raconte clairement à un nouveau visiteur

`nuxt-feathers-zod` n’est pas juste un SDK client.
C’est un **socle Nuxt 4 + Feathers v5** pour construire une architecture full-stack cohérente avec :

- un **serveur embedded** dans Nitro quand tu veux rester mono-repo,
- un **client remote** quand tu veux consommer une API Feathers externe,
- une **CLI** qui génère les pièces importantes au lieu de les recréer à la main,
- une trajectoire vers l’auth, Mongo management, diagnostics et builder tooling.

## Parcours le plus court

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

## Règles d’or

- Déclare `feathers.servicesDirs = ['services']`.
- Génère les services via la CLI.
- N’écris pas manuellement ton premier service si tu veux rester sur le chemin supporté.
- En mode remote, `feathers.templates.dirs` reste optionnel.

## Guides recommandés

- [Démarrage rapide](/guide/getting-started)
- [Services (Zod-first)](/guide/services)
- [Auth locale](/guide/auth-local)
- [Keycloak SSO](/guide/keycloak-sso)
- [Upload/download de fichiers](/guide/file-upload-download)
- [Dépannage](/guide/troubleshooting)

## Discipline de publication

La base publique du module est maintenant alignée autour de quatre vérifications simples :

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

Voir aussi :

- [Workflow communautaire](/guide/community-workflow)
- [Checklist de release](/guide/release-checklist)
- [Publication npm & Git](/guide/publishing)
