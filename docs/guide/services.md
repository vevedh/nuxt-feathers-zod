---
editLink: false
---
# Services (Zod-first)

Un service généré suit une convention stable :

```
services/<name>/
  <name>.ts
  <name>.class.ts
  <name>.schema.ts
  <name>.shared.ts
```

## Zod et hooks

- `*.schema.ts` définit les schémas Zod (data, patch, query, result)
- Les hooks Feathers branchent la validation via `@feathersjs/schema` (style v5)

## Exemple : créer `articles`

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter mongodb \
  --auth \
  --idField _id \
  --docs
```

## Endpoints

Avec `transports.rest.path = '/feathers'`, le service est exposé en :

- `GET /feathers/articles`
- `POST /feathers/articles`
- `PATCH /feathers/articles/:id`
- etc.

## Règles importantes

- Ne modifie pas les exports à la main sans comprendre le scan `servicesDirs`.
- Garde les services dans les dossiers déclarés dans `servicesDirs`.
- Évite les chemins Windows ambigus : privilégie toujours des chemins relatifs simples.
