---
title: Maintenance des dépendances avec taze
description: Procédure contrôlée pour mettre à jour les dépendances de nuxt-feathers-zod avec taze, Bun et la matrice de tests NFZ.
---

# Maintenance des dépendances avec taze

`nuxt-feathers-zod` utilise `taze` comme outil de maintenance contrôlée des dépendances.

L’objectif n’est pas de monter toutes les versions automatiquement, mais de faire évoluer le projet par paliers vérifiés : audit, patch, minor, tests, smoke CLI, build du module, puis test dans une application consommatrice comme NFZ Studio.

## Règle générale

```txt
Taze propose et applique les mises à jour.
La matrice NFZ valide le résultat.
La publication npm ne part que si les tests passent.
```

## Scripts disponibles

```bash
bun run deps:check
bun run deps:check:recursive
bun run deps:update:patch
bun run deps:update:minor
bun run deps:update:latest
bun run deps:update:major
```

Les commandes sûres recommandées sont :

```bash
bun run deps:update:safe
bun run deps:update:minor:safe
```

Elles exécutent :

```txt
taze patch/minor -w
bun install
matrice verify:all
```

## Matrice de validation

Après une mise à jour, exécuter :

```bash
bun run verify:all
```

Cette commande regroupe :

```bash
bun run build
bun run typecheck
bun test
bun run cli:build
bun run cli:smoke
bun run cli:full-smoke
bun run sanity:release-meta
bun run sanity:package-exports
bun run sanity:cli-dist-meta
bun run docs:check-frontmatter
```

Pour vérifier également que le lockfile est strictement respecté :

```bash
bun run verify:full
```

## Smoke CLI complet

Le script :

```bash
bun run cli:full-smoke
```

vérifie plusieurs commandes critiques :

```txt
nuxt-feathers-zod --help
nuxt-feathers-zod doctor
nuxt-feathers-zod init embedded --dry
nuxt-feathers-zod init remote --dry
nuxt-feathers-zod init templates --dry
nuxt-feathers-zod add service users --dry
nuxt-feathers-zod add file-service uploads --dry
nuxt-feathers-zod add middleware auth-keycloak --target route --dry
nuxt-feathers-zod add mongodb-compose --dry
nuxt-feathers-zod mongo management --dry
nuxt-feathers-zod remote auth keycloak --dry
```

Ce test protège les parties les plus sensibles du module : génération de templates, configuration Nuxt, commandes remote, MongoDB management, Keycloak et CLI packagée.

## Workflow recommandé

### 1. Audit simple

```bash
bun run deps:check
```

Pour scanner plusieurs `package.json` :

```bash
bun run deps:check:recursive
```

### 2. Mise à jour patch

```bash
bun run deps:update:safe
```

### 3. Mise à jour minor

```bash
bun run deps:update:minor:safe
```

### 4. Test packaging npm local

```bash
bun run build
npm pack
```

Puis dans une application consommatrice, par exemple NFZ Studio :

```bash
bun add ../nuxt-feathers-zod/nuxt-feathers-zod-<version>.tgz
bun dev
```

Ce test est plus proche d’une installation npm réelle qu’un simple `file://../nuxt-feathers-zod-main`.

## Paquets à surveiller

Les familles suivantes doivent être mises à jour avec prudence :

```txt
nuxt / nitropack / @nuxt/kit / @nuxt/schema
vite / vue / vue-router
pinia / feathers-pinia
@feathersjs/*
@feathersjs/mongodb / mongodb
quasar / @quasar/extras
zod
typescript / vitest / eslint
```

Ces paquets peuvent impacter :

```txt
imports ESM/CJS
transpilation Vite
runtime Nitro
client navigateur
Feathers auth
Mongo ObjectId
templates générés
build CLI
```

## Mises à jour majeures

Les mises à jour majeures doivent être traitées par lot, jamais en mise à jour globale aveugle :

```txt
Lot 1 : Nuxt / Nitro / Vite
Lot 2 : FeathersJS
Lot 3 : MongoDB
Lot 4 : Quasar / Pinia / feathers-pinia
Lot 5 : tooling TypeScript / Vitest / ESLint
```

Après chaque lot :

```bash
bun install
bun run verify:all
npm pack
```

Puis valider dans NFZ Studio.

## Publication

Avant `npm publish` :

```bash
bun install --frozen-lockfile
bun run verify:all
bun run build
npm pack
```

Publier uniquement si le tarball local est validé dans une application consommatrice.
