# Playground nuxt-feathers-zod

Ce playground sert à valider le module dans une application Nuxt réelle. Il couvre les modes `embedded` et `remote`, l’authentification locale ou Keycloak, REST, Socket.IO, MongoDB, les services personnalisés, Zod, le Builder et le RBAC.

## Démarrage recommandé

Depuis la racine du dépôt :

```powershell
bun upgrade
bun run verify:windows
bun run dev
```

Sous Linux ou macOS :

```bash
bun install --frozen-lockfile
bun run clean:repo
bun run typecheck
bun run dev
```

Le serveur écoute par défaut sur `http://localhost:3000`.

## Parcours de validation

1. Ouvrir `/` et lancer les contrôles rapides.
2. Se connecter avec le compte local de démonstration `test` / `12345` lorsque le scénario local est actif.
3. Ouvrir `/tests` pour valider un service et la restauration de session.
4. Ouvrir `/messages` pour tester un CRUD protégé.
5. Ouvrir `/actions` pour appeler une méthode personnalisée.
6. Ouvrir `/mongo` lorsque MongoDB est activé.
7. Ouvrir `/validation` pour comparer le scénario actif avec les autres configurations prises en charge.

Les pages de diagnostic avancé restent accessibles dans la navigation latérale : runtime d’authentification, REST, Socket.IO, middleware serveur, Builder et console RBAC.

## Principales routes

| Route | Validation |
|---|---|
| `/` | Santé du runtime et raccourcis essentiels |
| `/tests` | Connexion, auth locale, JWT et Keycloak |
| `/messages` | Service Feathers protégé et CRUD |
| `/actions` | Méthode personnalisée `actions.run()` |
| `/mongo` | Bases, collections, index, schémas et documents |
| `/builder` | Manifeste, schémas Zod et prévisualisation |
| `/validation` | Matrice des scénarios |
| `/remote/rest` | Configuration REST distante |
| `/remote/socketio` | État Socket.IO et reconnexion |
| `/auth-runtime` | Diagnostics détaillés de session |

## Configuration

Le playground charge d’abord le fichier `.env` à la racine du dépôt, puis `playground/.env` pour les valeurs manquantes. Les exemples de scénarios sont décrits dans `SCENARIOS_VALIDATION.md`.

Pour désactiver MongoDB mémoire pendant un test uniquement distant :

```dotenv
NFZ_PLAYGROUND_EMBEDDED_MONGODB=false
```


## Validation Builder et Zod

Les pages **Validation Zod**, **Console Builder** et **Console RBAC** utilisent `useBuilderClient()` et les services Feathers canoniques `nfz/*`. La découverte passe par `nfz/services.find()`, les schémas par `nfz/schemas` et les previews par `nfz/builder`.

Le playground n'utilise pas les façades historiques `/api/nfz/**`. Elles restent uniquement disponibles comme compatibilité 6.x lorsque `feathers.console.legacyNitroRoutes` vaut `true`.

