---
editLink: false
---
# Référence

Référence technique du module **nuxt-feathers-zod**.

Cette section documente l'architecture interne du module, ses options,
son runtime généré, la CLI et les conventions de génération.

## Architecture générale

```txt
nuxt-feathers-zod
├─ src/module.ts                # entrée du module Nuxt
├─ src/cli/                     # CLI bunx nuxt-feathers-zod
├─ src/runtime/options/         # résolution et normalisation des options
├─ src/runtime/templates/       # génération de .nuxt/feathers/**
├─ src/runtime/services.ts      # scan/import des services et schémas
├─ docs/                        # documentation VitePress
└─ playground/                  # application de validation du module
```

## Sous-sections

- [Architecture du module](/reference/module)
- [Configuration](/reference/configuration)
- [CLI](/reference/cli)
- [API runtime](/reference/runtime)
- [Mode embedded](/reference/embedded)
- [Mode remote](/reference/remote)
- [Services](/reference/services)
- [Middleware](/reference/middleware)
- [Authentification](/reference/authentication)
- [Templates](/reference/templates)
- [MongoDB management](/reference/mongodb-management)
- [Doctor](/reference/doctor)
- [RuntimeConfig](/reference/runtime-config)
- [Conventions](/reference/conventions)

## Deux modes exclusifs

### Embedded

Le module crée une application Feathers à l'intérieur de Nuxt/Nitro.
Les services sont exposés sous le préfixe REST configuré, généralement :

```txt
/feathers/<service>
```

### Remote

Le module ne démarre aucun serveur Feathers. Il configure seulement un
client Feathers vers une API externe.

## Nouvelles pages

- [Architecture](/reference/architecture)
- [Options](/reference/options)
- [Server modules](/reference/server-modules)
- [MongoDB management](/reference/mongodb-management)
- [Dépannage](/reference/troubleshooting)
