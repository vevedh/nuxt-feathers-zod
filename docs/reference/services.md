---
editLink: false
---
# Services

Les services embedded sont généralement générés via :

```bash
bunx nuxt-feathers-zod add service users
```

## Structure attendue

```txt
services/<name>/
  <name>.ts
  <name>.class.ts
  <name>.schema.ts
  <name>.shared.ts
```

## Rôle des fichiers

- `<name>.ts` : enregistrement du service
- `<name>.class.ts` : classe service (memory, mongodb, etc.)
- `<name>.schema.ts` : schémas Zod, validators, resolvers
- `<name>.shared.ts` : types et façade client

## Scan runtime

Le module scanne `feathers.servicesDirs` pour :

- trouver les services server-side en embedded
- trouver les schémas utiles à l'auth embedded
- générer le client typé côté runtime

## Bonnes pratiques

- garder `servicesDirs: ['services']`
- générer les services via la CLI officielle
- éviter la création manuelle quand ce n'est pas nécessaire
