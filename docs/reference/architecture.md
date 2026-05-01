# Architecture

`nuxt-feathers-zod` ajoute une couche FeathersJS v5 à Nuxt 4 avec une génération runtime dans `.nuxt/feathers`.

## Vue d’ensemble

```txt
Application Nuxt 4
├─ app/                         # UI, stores, composables Nuxt
├─ services/                    # Services Feathers générés
├─ server/feathers/             # Modules/hooks/plugins applicatifs optionnels
├─ feathers/templates/          # Overrides optionnels
└─ .nuxt/feathers/              # Runtime généré par NFZ
   ├─ client/
   └─ server/
```

## Pipeline du module

Le module suit ce flux :

```txt
defineNuxtModule
├─ resolveOptions()
├─ applyRuntimeConfig()
├─ applyAliases()
├─ applyTypeIncludes()
├─ applyServerLayer()
├─ applyClientLayer()
├─ applyDevtoolsLayer()
└─ applyMcpLayer()
```

## Résolution des options

Les options sont centralisées dans `src/runtime/options`.

```txt
src/runtime/options/
├─ authentication/
├─ client/
├─ database/
├─ transports/
├─ server.ts
├─ services.ts
├─ swagger.ts
├─ templates.ts
└─ index.ts
```

Cette séparation permet de documenter et tester chaque famille d’options indépendamment.

## Couche serveur embedded

En mode embedded, NFZ :

1. scanne `servicesDirs` ;
2. génère les templates serveur ;
3. ajoute le plugin serveur Nitro ;
4. expose le bridge REST si nécessaire ;
5. configure auth, MongoDB, services, plugins et modules serveur.

Ordre d’initialisation recommandé :

```txt
create app
→ authentication
→ MongoDB infrastructure
→ services
→ plugins scannés
→ server modules
→ app.setup()
```

## Couche client

La couche client :

- génère le client Feathers ;
- injecte `$api`, `$client` et helpers selon le mode ;
- ajoute les composables runtime ;
- ajoute les stores auth/session si Pinia est actif ;
- ajoute le plugin Keycloak si configuré ;
- force le plugin client-only en mode remote.

## CLI

Le CLI est organisé autour de :

```txt
src/cli/
├─ bin.ts
├─ index.ts        # commandes citty
├─ init.ts         # patch Nuxt config
├─ core.ts         # générateurs principaux
└─ commands/
   └─ doctor.ts
```

Les générateurs écrivent les services, manifests, middlewares, templates, compose MongoDB et configurations Nuxt.

## Runtime public

Le runtime public expose les informations nécessaires au client :

- transport REST/websocket ;
- mode client ;
- remote config ;
- auth publique ;
- keycloak public ;
- Mongo management public limité ;
- builder routes publiques ;
- diagnostics/devtools.

## Bonnes pratiques d’architecture

- Laisse le module générer `.nuxt/feathers`.
- Garde les services métier dans `services/`.
- Garde les modules infrastructure dans `server/feathers/modules`.
- Utilise `feathers/templates` uniquement pour les overrides assumés.
- Évite les imports directs vers `.nuxt/feathers` dans le code applicatif.
