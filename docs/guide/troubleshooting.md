---
editLink: false
---
# Dépannage

## 1) `Services typeExports []` / `Entity class User not found`

**Cause** :

- `feathers.servicesDirs` mal configuré
- service créé manuellement (non supporté)

**Fix** :

- Mets `servicesDirs: ['services']`
- Génère `users` via la CLI :

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --auth --idField _id --docs
```

## 2) Windows / ESM : `Could not load .../src/module(.ts)`

**Cause** : import du module local sans extension ou erreur TS au chargement.

**Fix** :

```ts
modules: ['../src/module.ts']
```

## 3) `[vue-tsc] Cannot find global type 'Array'` + libs TS introuvables

**Cause** : bug/corruption de `vite-plugin-checker` (bundle `typescript-vue-tsc`) dans le playground.

**Fix stable** :

- désactiver le typecheck du playground :

```ts
// playground/nuxt.config.ts
export default defineNuxtConfig({
  typescript: { typeCheck: false },
})
```

- faire le typecheck au root via `vue-tsc -p tsconfig.typecheck.json`.

## 4) Swagger UI ne charge pas la spec

Si l’UI est sur `/feathers/docs/`, la spec peut devoir être réglée manuellement à :

- `../swagger.json`

Et il est recommandé de **ne pas surcharger** `docsJsonPath` côté configuration.
