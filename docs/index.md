---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt 4"
  tagline: "Un module Nuxt backend-first pour embarquer Feathers dans Nitro ou connecter un client Feathers à une API distante, avec un workflow CLI-first propre à publier et maintenir."
  image:
    src: /images/plume-dark.png
    alt: Logo plume
  actions:
    - theme: brand
      text: Guide complet
      link: /guide/complete-guide
    - theme: alt
      text: Démarrage rapide
      link: /guide/getting-started
    - theme: alt
      text: Référence CLI
      link: /reference/cli

features:
  - title: "Nuxt 4 + Feathers v5"
    details: "Un socle full-stack pour exposer des services Feathers dans Nitro ou consommer une API Feathers distante."
  - title: "Deux modes maîtrisés"
    details: "Embedded pour les monorepos backend-first, remote pour connecter Nuxt à une API Feathers existante."
  - title: "CLI-first"
    details: "Initialisation, services, auth, remote services, middleware, MongoDB et templates sont générés de façon reproductible."
  - title: "Zod-first en option"
    details: "Schémas Zod, JSON Schema ou mode none selon la maturité et la criticité du service."
  - title: "Auth et SSO"
    details: "Auth locale/JWT, runtime client, stores Pinia et intégration Keycloak SSO pour les architectures remote."
  - title: "MongoDB et outils admin"
    details: "MongoDB embedded, management routes, console/builder, DevTools et diagnostics pour accélérer le développement."
  - title: "Starter professionnel"
    details: "Base Nuxt 4 + Quasar 2 + UnoCSS + Pinia + MongoDB avec auth locale et dashboard sécurisé."
  - title: "Documentation développeur"
    details: "Guides, référence des options, CLI complet, bonnes pratiques, troubleshooting et workflow de publication."
---

## Commence ici

- **Comprendre le module complet** → [Guide complet](/guide/complete-guide)
- **Lancer une app en quelques minutes** → [Démarrage rapide](/guide/getting-started)
- **Choisir le bon mode** → [Modes embedded/remote](/guide/modes)
- **Créer des services** → [Services](/guide/services)
- **Configurer toutes les options** → [Référence des options](/reference/options)
- **Utiliser le CLI** → [Référence CLI](/reference/cli)

## Exemple minimal

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
bun dev
```

## Positionnement

`nuxt-feathers-zod` n’est pas seulement un SDK client. C’est un module Nuxt 4 pour structurer un backend Feathers, générer les artefacts répétitifs, exposer des transports REST/Socket.IO et garder la configuration synchronisée avec le code.

Le chemin recommandé est simple : initialise avec le CLI, génère les services, active Zod sur les contrats durables, centralise l’accès client et protège toutes les surfaces d’administration.
