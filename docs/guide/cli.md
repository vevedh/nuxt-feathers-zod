---
editLink: false
---
# CLI

La CLI est la **seule méthode supportée** pour ajouter des services/middlewares compatibles.

## Commande

```bash
bunx nuxt-feathers-zod <command>
```

## `add service`

```bash
bunx nuxt-feathers-zod add service <name> \
  --adapter mongodb|memory \
  --auth \
  --idField _id \
  --path /custom-path \
  --collection collectionName \
  --docs
```

### Options principales

- `--adapter` : génère un service MongoDB ou Memory.
- `--auth` : ajoute les hooks `around` d’auth (JWT) sur le service (mode auth locale).
- `--idField` : champ identifiant (ex `_id` avec Mongo).
- `--path` : endpoint Feathers (par défaut `/name`).
- `--collection` : nom de collection Mongo (par défaut = path).
- `--docs` : ajoute `docs` (swagger legacy) sur le service.

## `add middleware`

Selon la version, la CLI peut aussi générer des middlewares (ex: guards, helpers, etc.).

## Pourquoi la CLI est obligatoire

Le module scanne les services via `servicesDirs`, puis construit des **imports statiques** utilisés pour :

- générer les exports/types,
- résoudre l’entité `User` (auth),
- brancher les hooks Zod et la doc swagger.

Une création manuelle casse souvent la découverte (symptômes classiques : `Services typeExports []`, `Entity class User not found`).
