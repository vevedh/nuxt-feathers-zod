# Référence CLI

Cette page est générée depuis l’arbre de commandes réellement exporté par la CLI. Les commandes et options ci-dessous correspondent donc à la version publiée du module.

```bash
bunx nuxt-feathers-zod --help
bunx nuxt-feathers-zod capabilities --section all --json
```

## Principes d’utilisation

- Exécutez `doctor` après une génération ou une modification importante de `nuxt.config.ts`.
- Utilisez `--dry` lorsqu’il est disponible pour vérifier un patch avant écriture.
- Utilisez `--force` uniquement lorsque vous acceptez de remplacer un artefact existant.
- Pour un service métier, préférez `add service` ou `add custom-service` à une création manuelle de dossiers.
- Le format des champs de `schema --add-field` est `nom:type!` pour un champ requis, par exemple `title:string!`.

## Catalogue des commandes

| Commande | Rôle | Arguments et options |
|---|---|---|
| `add custom-service` | Alias explicite pour générer un service personnalisé sans adapter standard. | `<name>`<br>`--schema <none|zod|json>`<br>`--auth`<br>`--authAware`<br>`--path <value>`<br>`--methods <value>`<br>`--customMethods <value>`<br>`--docs`<br>`--servicesDir <value>`<br>`--force`<br>`--dry` |
| `add file-service` | Génère un service local de dépôt et téléchargement de fichiers. | `<name>`<br>`--path <value>`<br>`--storageDir <value>`<br>`--auth`<br>`--docs`<br>`--servicesDir <value>`<br>`--force`<br>`--dry` |
| `add middleware` | Génère un middleware ou un artefact serveur ciblé. | `<name>`<br>`--target <nitro|route|feathers|server-module|module|client-module|hook|policy>`<br>`--force`<br>`--dry` |
| `add mongodb-compose` | Génère un fichier Compose MongoDB de développement. | `--out <value>`<br>`--service <value>`<br>`--port <value>`<br>`--database <value>`<br>`--rootUser <value>`<br>`--rootPassword <value>`<br>`--volume <value>`<br>`--force`<br>`--dry` |
| `add remote-service` | Déclare un service Feathers distant dans la configuration client. | `<name>`<br>`--path <value>`<br>`--methods <value>`<br>`--dry` |
| `add server-module` | Génère un module serveur Feathers/Nitro à partir d’un preset. | `<name>`<br>`--preset <helmet|security-headers|request-logger|healthcheck|rate-limit|express-baseline>`<br>`--force`<br>`--dry` |
| `add service` | Génère un service Feathers avec adapter memory ou MongoDB, ou un service personnalisé. | `<name>`<br>`--custom`<br>`--type <adapter|custom>`<br>`--adapter <memory|mongodb>`<br>`--schema <none|zod|json>`<br>`--auth`<br>`--authAware`<br>`--idField <id|_id>`<br>`--path <value>`<br>`--collection <value>`<br>`--methods <value>`<br>`--customMethods <value>`<br>`--docs`<br>`--servicesDir <value>`<br>`--force`<br>`--dry` |
| `auth service` | Active ou désactive les hooks JWT sur un service existant. | `<name>`<br>`--servicesDir <value>`<br>`--enabled`<br>`--dry` |
| `capabilities` | Expose la matrice des capacités réellement implémentées par la version installée. | `--section <summary|runtime|services|client|events|all>`<br>`--json` |
| `doctor` | Analyse le projet courant et signale les incohérences de configuration ou de services. | — |
| `init embedded` | Configure Nuxt avec un serveur Feathers embarqué dans Nitro. | `--framework <express|koa>`<br>`--servicesDir <value>`<br>`--restPath <value>`<br>`--websocketPath <value>`<br>`--websocketTransports <value>`<br>`--websocketConnectTimeout <value>`<br>`--websocketCorsOrigin <value>`<br>`--websocketCorsCredentials`<br>`--websocketCorsMethods <value>`<br>`--secureDefaults`<br>`--cors`<br>`--compression`<br>`--helmet`<br>`--bodyParserJson`<br>`--bodyParserUrlencoded`<br>`--serveStatic`<br>`--serveStaticPath <value>`<br>`--serveStaticDir <value>`<br>`--auth`<br>`--swagger`<br>`--serverModulesPreset <value>`<br>`--expressBaseline`<br>`--force`<br>`--dry` |
| `init remote` | Configure le client Nuxt pour une API Feathers distante. | `--url <value> *`<br>`--transport <auto|rest|socketio>`<br>`--restPath <value>`<br>`--websocketPath <value>`<br>`--websocketTransports <value>`<br>`--websocketConnectTimeout <value>`<br>`--websocketCorsOrigin <value>`<br>`--websocketCorsCredentials`<br>`--websocketCorsMethods <value>`<br>`--auth`<br>`--payloadMode <jwt|keycloak>`<br>`--strategy <value>`<br>`--tokenField <value>`<br>`--servicePath <value>`<br>`--reauth`<br>`--force`<br>`--dry` |
| `init starter` | Copie le starter Nuxt 4 + Quasar 2 + UnoCSS + Pinia livré avec le package. | `--preset <value>`<br>`--dir <value>`<br>`--force`<br>`--dry` |
| `init templates` | Installe les templates modifiables du module. | `--dir <value>`<br>`--force`<br>`--diff`<br>`--dry` |
| `middlewares add` | Génère un middleware à partir du registre de presets. | `<name>`<br>`--target <nitro|route|feathers|server-module|module|client-module|hook|policy>`<br>`--force`<br>`--dry` |
| `middlewares list` | Liste les middlewares et artefacts ciblés. | `--target <all|nitro|route|feathers|hook|policy|client-module|server-module|module>` |
| `modules add` | Génère un module serveur. | `<name>`<br>`--preset <helmet|security-headers|request-logger|healthcheck|rate-limit|express-baseline>`<br>`--force`<br>`--dry` |
| `modules list` | Liste les modules serveur détectés. | — |
| `mongo management` | Configure les services d’administration MongoDB exposés par le module. | `--url <value>`<br>`--enabled`<br>`--auth`<br>`--basePath <value>`<br>`--exposeDatabasesService`<br>`--exposeCollectionsService`<br>`--exposeUsersService`<br>`--exposeCollectionCrud`<br>`--whitelistDatabases <value>`<br>`--blacklistDatabases <value>`<br>`--whitelistCollections <value>`<br>`--blacklistCollections <value>`<br>`--showSystemDatabases`<br>`--allowCreateDatabase`<br>`--allowDropDatabase`<br>`--allowCreateCollection`<br>`--allowDropCollection`<br>`--allowInsertDocuments`<br>`--allowPatchDocuments`<br>`--allowReplaceDocuments`<br>`--allowRemoveDocuments`<br>`--dry` |
| `plugins add` | Génère un plugin serveur Feathers. | `<name>`<br>`--force`<br>`--dry` |
| `plugins list` | Liste les plugins serveur détectés. | — |
| `remote auth keycloak` | Configure le mode client Keycloak pour un backend distant. | `--ssoUrl, --url <value> *`<br>`--realm <value> *`<br>`--clientId <value> *`<br>`--dry` |
| `schema` | Inspecte, valide et modifie le manifeste de schéma d’un service. | `<name>`<br>`--show`<br>`--get`<br>`--json`<br>`--export`<br>`--set-mode <none|zod|json>`<br>`--add-field <value>`<br>`--remove-field <value>`<br>`--set-field <value>`<br>`--rename-field <value>`<br>`--validate`<br>`--repair-auth`<br>`--servicesDir <value>`<br>`--dry`<br>`--diff`<br>`--force` |
| `templates init` | Installe les templates dans le projet. | `--dir <value>`<br>`--force`<br>`--diff`<br>`--dry` |
| `templates list` | Liste les templates disponibles. | — |

## Parcours recommandés

### Backend Feathers embarqué

```bash
bunx nuxt-feathers-zod init embedded --auth --framework express
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --auth
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
bunx nuxt-feathers-zod schema articles --add-field title:string!
bunx nuxt-feathers-zod doctor
```

### Service personnalisé

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find --customMethods run --schema zod
```

### Client distant

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.test --transport socketio --auth
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bunx nuxt-feathers-zod doctor
```

## Source de vérité

La commande `capabilities --json` expose les modes, transports, services NFZ, composables et événements d’authentification implémentés. Le contrôle de cohérence du dépôt compare cette matrice au runtime, au playground et à la documentation.

<!-- release-version: 6.6.0 -->
