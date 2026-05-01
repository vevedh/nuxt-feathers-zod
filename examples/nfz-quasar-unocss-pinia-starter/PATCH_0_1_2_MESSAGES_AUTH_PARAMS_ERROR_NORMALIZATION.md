# Patch 0.1.2 - Messages auth params + error normalization

## Problème corrigé

Sur `/messages`, l'utilisateur pouvait être authentifié dans l'UI mais voir une bannière `[object Object]`.

## Corrections

- Ajout de `app/utils/errors.ts`.
- Remplacement de `String(err)` par `getErrorMessage(err)`.
- Ajout de logs debug Feathers lisibles dans `useAdminFeathers()`.
- Injection explicite du JWT dans les appels service:
  - `headers.Authorization`
  - `authentication: { strategy: 'jwt', accessToken }`
- Suppression du `$sort` imbriqué dans la query REST de `messages.find()`.
- Tri des messages par `createdAt` côté couche d'accès.
- Normalisation Mongo `_id` vers `id`.
- Amélioration de l'UI de la bannière d'erreur.

## Fichiers modifiés

- `package.json`
- `app/utils/errors.ts`
- `app/composables/useAdminFeathers.ts`
- `app/composables/useLocalAuthUi.ts`
- `app/stores/messages.ts`
- `app/pages/messages.vue`
- `services/messages/messages.schema.ts`
- `README.md`
- `PROMPT_CONTEXT.md`
- `JOURNAL.md`
