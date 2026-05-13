---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt 4"
  tagline: "Un module Nuxt backend-first pour embarquer Feathers dans Nitro ou connecter un client Feathers à une API distante, avec un workflow CLI-first propre à publier, maintenir et exploiter en production."
  image:
    src: /images/plume-dark.png
    alt: Logo plume nuxt-feathers-zod
  actions:
    - theme: brand
      text: Démarrage rapide
      link: /guide/getting-started
    - theme: alt
      text: Guide complet
      link: /guide/complete-guide
    - theme: alt
      text: Mise en production
      link: /guide/production
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
    details: "Auth locale/JWT, runtime client, stores Pinia, Keycloak SSO et bridge LDAP/AD pour les architectures remote."
  - title: "MongoDB et outils admin"
    details: "MongoDB embedded, management routes, console/builder, DevTools et diagnostics pour accélérer le développement."
  - title: "Production-ready"
    details: "Guides de configuration, runtimeConfig, checks de publication, sécurité des secrets, transports et déploiement."
  - title: "API runtime claire"
    details: "Composables, client Feathers, auth runtime, services typés et événements documentés pour les applications Nuxt."
  - title: "Documentation développeur"
    details: "Guides, référence des options, CLI complet, événements/hooks, bonnes pratiques et troubleshooting."
---

## Commence ici

- **Comprendre le module complet** → [Guide complet](/guide/complete-guide)
- **Lancer une app en quelques minutes** → [Démarrage rapide](/guide/getting-started)
- **Préparer une mise en production** → [Checklist de production](/guide/production)
- **Construire une app métier Nuxt 4 + Quasar** → [Guide intégration réelle](/guide/real-world-nuxt4-quasar-app)
- **Choisir le bon mode** → [Modes embedded/remote](/guide/modes)
- **Créer des services** → [Services](/guide/services)
- **Configurer toutes les options** → [Référence configuration](/reference/configuration)
- **Comprendre le runtime** → [API runtime](/reference/runtime)
- **Tracer les événements et hooks** → [Événements et hooks](/reference/events)
- **Bridge remote Keycloak + LDAP/AD** → [Guide Keycloak LDAP SPA](/guide/remote-keycloak-ldap)
- **Variante SSR Keycloak + LDAP/AD** → [Guide Keycloak LDAP SSR](/guide/remote-keycloak-ldap-ssr)
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

## Parcours production

Avant publication ou déploiement, vérifie en priorité :

```bash
bun install
bun run docs:build
bun run typecheck
bun run build
bun run test
```

Les points critiques sont détaillés dans la [checklist de production](/guide/production) : secrets, transports, CORS, auth, base de données, génération des services et validation documentaire.
