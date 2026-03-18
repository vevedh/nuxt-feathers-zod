---
editLink: false
---
# Middleware

Le module peut générer plusieurs familles de middleware et modules serveur.

## Middleware Nitro

Cible : `--target nitro`

Utilisé pour la couche Nuxt/Nitro elle-même.

Exemple :

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
```

## Middleware de route Nuxt

Cible : `--target route`

Utilisé pour générer un middleware de navigation sous `app/middleware/*.ts`.

Exemples :

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```

Le nom `auth-keycloak` génère un guard prêt à l’emploi pour les routes protégées et ajoute aussi `public/silent-check-sso.html` si nécessaire.

## Plugin serveur Feathers

Cible : `--target feathers`

Utilisé pour générer un plugin sous `server/feathers/*.ts`.

Exemple :

```bash
bunx nuxt-feathers-zod add middleware audit --target feathers
```

## Server modules embedded

Cible : `--target server-module` ou commande dédiée `add server-module`.

Exemples :

```bash
bunx nuxt-feathers-zod add middleware metrics --target server-module
bunx nuxt-feathers-zod add server-module helmet --preset helmet
```

## Cibles supportées

- `nitro`
- `route`
- `feathers`
- `server-module`
- `module`

## Important

La documentation plus ancienne mentionnait parfois `--target client`. Ce n’est **pas** une cible supportée par la CLI actuelle du core OSS.
