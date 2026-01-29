# Conventions de génération

## Services

Un service généré suit :

- `<name>.ts` : enregistrement du service
- `<name>.class.ts` : classe service (MongoDBService/MemoryService)
- `<name>.schema.ts` : schémas Zod (data/patch/query/result)
- `<name>.shared.ts` : types partagés + helpers (client)

## Règle : `servicesDirs` + CLI

- `feathers.servicesDirs` doit pointer sur le dossier racine des services.
- Les services doivent être générés via `bunx nuxt-feathers-zod add service ...`.

## Keycloak-only

Quand `feathers.keycloak` est fourni :

- `feathers.auth` est désactivé
- le plugin client `keycloak-sso` est activé (client-only)
- le serveur ajoute un hook global `keycloakAuthorizationHook`
- un bridge service est monté sur `authServicePath` (par défaut `/_keycloak`)

---

Si tu veux automatiser plus (RBAC, guards, etc.), c’est l’endroit où ajouter des conventions.
