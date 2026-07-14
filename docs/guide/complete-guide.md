# Plan de la documentation

`nuxt-feathers-zod` est un module Nuxt 4 qui intègre Feathers dans Nitro ou connecte Nuxt à une API Feathers distante. Le contrat applicatif reste **Feathers-first** : les services, méthodes, événements, hooks et règles d’authentification appartiennent à Feathers. Nitro héberge le runtime et fournit l’intégration Nuxt/H3.

Cette documentation suit le même ordre que le module.

## 1. Comprendre le socle

1. [Vue d’ensemble](/reference/) : capacités réellement exposées.
2. [Architecture](/reference/architecture) : séparation Nuxt, Nitro, Feathers et Zod.
3. [Processus du module](/reference/module) : ordre de résolution, génération et démarrage.
4. [Modes embedded et remote](/guide/modes) : choisir le bon mode client et serveur.

## 2. Construire une application

1. [Démarrage rapide](/guide/getting-started).
2. [Services Feathers et Zod](/guide/services).
3. [Utilisation frontend](/guide/frontend).
4. [Configuration](/reference/configuration).
5. [Référence CLI](/reference/cli).

## 3. Sécuriser les accès

- [Authentification](/reference/authentication).
- [Auth locale JWT](/guide/auth-local).
- [Runtime d’authentification](/guide/auth-runtime).
- [Keycloak SSO](/guide/keycloak-sso).
- [Événements d’authentification](/reference/events).

## 4. Valider le runtime

Le [playground](/guide/playground) est l’application de validation du dépôt. Il couvre les services Feathers, les schémas Zod, l’authentification, MongoDB, REST, Socket.IO, le Builder et le RBAC.

La CLI complète le playground :

```bash
bunx nuxt-feathers-zod capabilities --section all --json
bunx nuxt-feathers-zod doctor
```

`capabilities` expose les fonctions implémentées par la version installée. `doctor` analyse le projet courant.

## 5. Exploiter et publier

- [Mise en production](/guide/production).
- [Matrice de compatibilité](/guide/compatibility-matrix).
- [Limites connues](/guide/known-limits).
- [Dépannage](/guide/troubleshooting).
- [Publication npm et Git](/guide/publishing).

## Sources de vérité du projet

La cohérence est contrôlée entre quatre surfaces :

| Surface | Source |
|---|---|
| Capacités du module | `src/runtime/capabilities.ts` |
| Commandes et options CLI | arbre `createCliCommand()` |
| Runtime Nuxt/Feathers | `src/module.ts`, `src/setup/`, `src/runtime/` |
| Parcours de validation | `playground/app/composables/usePlaygroundNavigation.ts` |

Les références CLI sont générées depuis l’arbre de commandes. Un contrôle de cohérence vérifie aussi les options du module, les services NFZ, les composables, les événements et les routes du playground.

<!-- release-version: 6.5.47 -->
