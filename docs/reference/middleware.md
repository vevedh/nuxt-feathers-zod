---
editLink: false
---
# Middleware

Le module peut générer plusieurs familles de middleware.

## Middleware Nitro

Cible : `--target nitro`

Utilisé pour la couche Nuxt/Nitro elle-même.

## Middleware Feathers

Cible : `--target feathers`

Utilisé pour générer des plugins ou modules serveur Feathers dans l'application.

## Middleware client

Cible : `--target client`

Exemple :

```bash
bunx nuxt-feathers-zod add middleware auth --target client
```

Fichiers générés :

```txt
app/plugins/nfz-auth.client.ts
app/middleware/auth.global.ts
```

## Usage

Cette couche auth client :

- initialise `useAuth()` côté navigateur
- protège les routes par défaut
- respecte `definePageMeta({ auth: false })`
- peut rediriger vers `/login`
- peut déclencher un flux Keycloak selon la configuration


## Server modules

```bash
bunx nuxt-feathers-zod add middleware metrics --target server-module
```
