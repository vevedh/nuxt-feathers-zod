---
editLink: false
---
# Structure des services

## Fichiers

```txt
services/<service>/
  <service>.ts
  <service>.class.ts
  <service>.schema.ts
  <service>.shared.ts
```

## Style attendu

- Zod-first (schema, resolvers)
- hooks `@feathersjs/schema` (validateQuery/validateData/resolve\*)
- docs swagger legacy via `docs` (si activé)
