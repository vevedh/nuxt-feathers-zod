# Processus du module

Cette page décrit l’ordre réel d’exécution du module Nuxt.

## Résolution au build Nuxt

`src/module.ts` exécute le processus suivant :

1. `resolveOptions()` résout les valeurs par défaut et les chemins absolus.
2. `applyRuntimeConfig()` sépare la configuration privée et la configuration publique.
3. `applyConsoleLayer()` enregistre uniquement les façades Nitro historiques si elles sont activées.
4. `applyAliases()` configure les alias runtime.
5. `applyTypeIncludes()` ajoute les types nécessaires au projet.
6. Nitro reçoit l’option websocket expérimentale lorsque Socket.IO est actif.
7. `applyServerLayer()` prépare le serveur embedded et découvre les services.
8. `applyClientLayer()` prépare le client embedded ou remote.
9. `applyDevtoolsLayer()` expose les diagnostics de développement.
10. `applyMcpLayer()` applique l’intégration MCP lorsqu’elle est configurée.

## Démarrage du serveur embedded

Le bootstrap suit cet ordre logique :

```text
infrastructure
  ↓
modules:pre
  ↓
plugins
  ↓
services
  ↓
modules:post
  ↓
app.setup()
  ↓
routeurs REST et Socket.IO
  ↓
ready
```

La disponibilité n’est résolue qu’après la création des routeurs. Le routeur Socket.IO est attendu avec `await`.

## Découverte des services

`servicesDirs` est résolu par rapport à la racine Nuxt. Un chemin déjà absolu reste absolu.

Le scanner construit un manifeste déterministe utilisé par :

- les imports serveur ;
- les schémas ;
- les services NFZ de console ;
- les diagnostics.

## Enregistrement des services NFZ

Lorsque `console.enabled` est actif, les services NFZ sont enregistrés avant `app.setup()` :

```text
nfz/services
nfz/schemas
nfz/manifest
nfz/builder
nfz/status
nfz/rbac
nfz/presets
nfz/init
```

Une application qui a déjà fourni un service au même chemin n’est pas écrasée.

## Arrêt

Le teardown est idempotent :

1. l’instance passe en fermeture ;
2. Feathers exécute `app.teardown()` ;
3. le `MongoClient` détenu par le runtime est fermé ;
4. l’instance est retirée du registre ;
5. un second appel de fermeture reste sans effet dangereux.

## Fichiers structurants

| Zone | Rôle |
|---|---|
| `src/module.ts` | entrée du module Nuxt |
| `src/setup/` | couches de configuration Nuxt/Nitro |
| `src/runtime/server/` | bootstrap et runtime Feathers embedded |
| `src/runtime/composables/` | API Nuxt côté client |
| `src/runtime/options/` | types et résolution de configuration |
| `src/cli/` | commandes et générateurs |
| `services/` | services du playground et échantillons de validation |
| `playground/` | centre de validation fonctionnelle |

<!-- release-version: 6.5.41 -->
