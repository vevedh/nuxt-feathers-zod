---
editLink: false
---
# Playground de validation

Le dossier `playground/` est l’application de contrôle du dépôt. Il n’est pas distribué dans le tarball npm. Son rôle est de tester les fonctions essentielles du module contre le runtime réellement construit.

## Démarrer le playground

Sous Windows ou Linux :

```bash
bun install --frozen-lockfile
bun run dev
```

Build sans démarrage de MongoDB mémoire :

```bash
bun run playground:build
```

Le build désactive MongoDB mémoire par défaut afin de rester déterministe. Le mode développement conserve le scénario mémoire.

## Parcours principal

| Route | Validation |
|---|---|
| `/` | état général, client Feathers, runtime NFZ, services et MongoDB |
| `/tests` | connexion, services et authentification |
| `/validation` | matrice des scénarios embedded, remote, REST, Socket.IO et SSO |

## Fonctions métier

| Route | Validation |
|---|---|
| `/messages` | CRUD Feathers protégé |
| `/actions` | méthode personnalisée `actions.run()` |
| `/mongo` | client MongoDB Management |
| `/builder` | découverte, schémas Zod, manifeste et preview Builder |

## Runtime et transports

| Route | Validation |
|---|---|
| `/auth-runtime` | statut, trace et événements d’authentification |
| `/embedded` | backend Feathers embarqué |
| `/remote/rest` | accès REST distant |
| `/remote/socketio` | accès Socket.IO, temps réel et reconnexion |
| `/middleware` | ordre des modules, plugins, services et hooks |

## Outils avancés

| Route | Validation |
|---|---|
| `/ldapusers` | service distant déclaré |
| `/mongos` | lecture directe d’un service Feathers et disponibilité de Pinia |
| `/console/builder` | Console Builder Feathers-first |
| `/console/rbac` | lecture et édition contrôlée des politiques RBAC |

## Service `mongos`

La page `/mongos` vérifie deux contrats séparés :

- `useService('mongos')` retourne le service Feathers typé et les lectures utilisent directement `find()` ;
- `useNfzPinia()` indique si l’instance Pinia de l’application est disponible pour les stores métier explicites.

Le runtime client standard ne transforme pas les services Feathers en stores et n’expose pas `useFind()`, `useGet()` ou d’autres méthodes de store historiques.

## Console Builder

La Console Builder utilise exclusivement `useBuilderClient()` :

```ts
const builder = useBuilderClient()

const discovery = await builder.getServices()
const schema = await builder.getSchema('users')
const preview = await builder.preview({
  service: 'users',
  fields: schema.fields,
})
```

Les services sont découverts via `nfz/services.find()`. La page normalise les entrées `{ name, source }`, sélectionne un service et charge son schéma avec `nfz/schemas.get()`.

Lorsque `feathers.console.allowWrite` vaut `false`, les actions d’écriture sont désactivées. Les previews et diagnostics restent disponibles.

## Console RBAC

La page `/console/rbac` lit :

- `nfz/status.find()` ;
- `nfz/rbac.get('current')` ;
- `nfz/services.find()`.

L’écriture passe par `nfz/rbac.patch('current', payload)` uniquement si la console autorise les écritures.

## Règle de cohérence

Les pages du playground ne doivent pas appeler les anciennes façades `/api/nfz/**`. Ces routes Nitro restent uniquement une compatibilité 6.x facultative. Le playground valide l’API canonique Feathers `nfz/*`.

<!-- release-version: 6.5.49 -->
