---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt 4"
  tagline: "Un module Nuxt Feathers-first pour exécuter Feathers dans Nitro ou connecter Nuxt à une API distante, avec génération CLI, validation Zod et outils de diagnostic cohérents."
  image:
    src: /images/nfz-feather.webp
    alt: Logo plume nuxt-feathers-zod
  actions:
    - theme: brand
      text: Démarrage rapide
      link: /guide/getting-started
    - theme: alt
      text: Plan technique
      link: /guide/complete-guide
    - theme: alt
      text: Configuration
      link: /reference/configuration
    - theme: alt
      text: Référence CLI
      link: /reference/cli

features:
  - title: "API Feathers-first"
    details: "Services, méthodes, hooks et événements restent dans Feathers. Nitro héberge le runtime et l'infrastructure Nuxt."
  - title: "Embedded ou remote"
    details: "Exécutez Feathers dans Nitro ou connectez le même modèle client à une API Feathers distante."
  - title: "CLI synchronisée"
    details: "Initialisation, services, schémas, auth, MongoDB, templates et modules sont documentés depuis l'arbre de commandes réel."
  - title: "Zod selon le service"
    details: "Choisissez un schéma Zod, JSON ou aucun schéma selon le contrat et le niveau de validation attendu."
  - title: "Auth et SSO"
    details: "Auth locale/JWT, runtime de session, Keycloak client ou bridge et diagnostics d'authentification."
  - title: "Services NFZ"
    details: "Builder, schémas, manifeste, statut, RBAC, presets et initialisation sont exposés comme services Feathers."
  - title: "Playground de validation"
    details: "Un centre de validation couvre services, Zod, auth, MongoDB, REST, Socket.IO, Builder et RBAC."
  - title: "Production et sécurité"
    details: "Readiness déterministe, secrets résolus au runtime, teardown idempotent et contrôles de release."
  - title: "Référence vérifiée"
    details: "Options, composables, événements, services, CLI et routes du playground sont contrôlés contre le code source."
---

## Projet

- [Voir le package sur npm](https://www.npmjs.com/package/nuxt-feathers-zod)
- [Consulter le dépôt GitHub](https://github.com/vevedh/nuxt-feathers-zod)

## Parcours conseillé

1. [Comprendre l’architecture](/reference/architecture).
2. [Installer et démarrer](/guide/getting-started).
3. [Configurer le module](/reference/configuration).
4. [Créer les services](/guide/services).
5. [Utiliser l’API client](/reference/runtime).
6. [Valider avec le playground](/guide/playground).
7. [Préparer la production](/guide/production).

## Exemple minimal

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bunx nuxt-feathers-zod init embedded --auth
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
bunx nuxt-feathers-zod doctor
bun dev
```

## Vérifier les capacités de la version installée

```bash
bunx nuxt-feathers-zod capabilities --section all --json
```

Cette commande expose les modes, transports, services NFZ, composables et événements implémentés par la version du package.

<!-- release-version: 6.5.41 -->
