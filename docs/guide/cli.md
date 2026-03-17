---
editLink: false
---
# CLI

La CLI `bunx nuxt-feathers-zod` est la **méthode officielle** pour initialiser une app Nuxt 4, générer les artefacts du module et diagnostiquer un projet existant.

Cette page aligne la documentation publique sur la surface CLI OSS stabilisée pour la release **6.3.9**.

## Commande d’entrée

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

## Surface CLI OSS officielle

### Initialisation

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`

### Génération et maintenance des services

- `add service <name>`
- `add service <name> --custom`
- `add remote-service <name>`
- `auth service <name>`
- `schema <service>`

### Artefacts runtime

- `add middleware <name>`
- `add server-module <name>`
- `add mongodb-compose`
- `mongo management`

### Helpers OSS templates/modules/plugins/middlewares

- `templates list`
- `plugins list`
- `plugins add <name>`
- `modules list`
- `modules add <name>`
- `middlewares list`
- `middlewares add <name>`

### Diagnostic

- `doctor`

## Vérification minimale de stabilité

```bash
bunx nuxt-feathers-zod --help
bunx nuxt-feathers-zod doctor
```

## Parcours recommandé : nouvelle app Nuxt 4

### Embedded

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

### Embedded + auth locale

```bash
bunx nuxi@latest init my-nfz-auth
cd my-nfz-auth
bun install
bun add nuxt-feathers-zod feathers-pinia feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --auth --swagger
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod --collection users --idField _id --docs
bun dev
```

### Remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Règles DX importantes

- **adapter par défaut = `memory`**
- **schema par défaut = `none`**
- **servicesDirs recommandé = `['services']`**
- en embedded, **générer les services via la CLI**
- en remote, `transport: auto` résout actuellement vers **socketio**
- `add custom-service` reste compatible, mais la forme publique recommandée est `add service <name> --custom`

## `init templates`

Initialise un dossier d’override de templates.

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates
```

Options utiles :

- `--dir <dir>`
- `--force`
- `--dry`
- `--diff`

## `init embedded`

Initialise le mode **embedded** : serveur Feathers dans Nitro.

```bash
bunx nuxt-feathers-zod init embedded --force
```

Flags importants :

- `--framework express|koa`
- `--servicesDir <dir>`
- `--restPath <path>`
- `--websocketPath <path>`
- `--websocketTransports <list>`
- `--websocketConnectTimeout <ms>`
- `--websocketCorsOrigin <value>`
- `--websocketCorsCredentials true|false`
- `--websocketCorsMethods <list>`
- `--secureDefaults true|false`
- `--cors true|false`
- `--compression true|false`
- `--helmet true|false`
- `--bodyParserJson true|false`
- `--bodyParserUrlencoded true|false`
- `--serveStatic true|false`
- `--serveStaticPath <path>`
- `--serveStaticDir <dir>`
- `--serverModulesPreset <name>`
- `--expressBaseline`
- `--auth true|false`
- `--swagger true|false`
- `--force`
- `--dry`

## `init remote`

Initialise le mode **remote** : client Feathers vers un serveur externe.

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
```

Flags importants :

- `--url <http(s)://...>`
- `--transport socketio|rest|auto`
- `--restPath <path>`
- `--websocketPath <path>`
- `--websocketTransports <list>`
- `--websocketConnectTimeout <ms>`
- `--websocketCorsOrigin <value>`
- `--websocketCorsCredentials true|false`
- `--websocketCorsMethods <list>`
- `--auth true|false`
- `--payloadMode jwt|keycloak`
- `--strategy <name>`
- `--tokenField <name>`
- `--servicePath <path>`
- `--reauth true|false`
- `--force`
- `--dry`

## `remote auth keycloak`

Configure le bridge Keycloak côté app.

```bash
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm myrealm --clientId myapp
```

## `add service <name>`

Génère un service embedded.

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --collection users --idField _id
```

Options utiles :

- `--custom`
- `--type adapter|custom`
- `--adapter memory|mongodb`
- `--schema none|zod|json`
- `--auth true|false`
- `--authAware true|false`
- `--idField id|_id`
- `--path <servicePath>`
- `--collection <name>`
- `--methods find,get,create,patch,remove`
- `--customMethods run,preview`
- `--docs true|false`
- `--servicesDir <dir>`
- `--force`
- `--dry`

### Génération auth-aware de `users`

`--auth` protège les méthodes via JWT. `--authAware` gère la sémantique auth locale (hash + masquage du mot de passe).

Exemples :

```bash
bunx nuxt-feathers-zod add service users --auth --schema none --adapter memory --force
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id --force
bunx nuxt-feathers-zod add service users --auth --authAware false --schema json --adapter memory --force
```

## `add remote-service <name>`

Ajoute un service client-only dans `feathers.client.remote.services`.

```bash
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
```

## `auth service <name>`

Active ou désactive les hooks JWT sur un service embedded existant.

```bash
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod auth service users --enabled false
```

## `schema <service>`

Inspecte ou modifie le mode de schéma et les champs du manifest de service.

```bash
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --json
bunx nuxt-feathers-zod schema users --set-mode zod
bunx nuxt-feathers-zod schema users --add-field title:string!
bunx nuxt-feathers-zod schema users --rename-field title:headline
```

Flags principaux :

- `--show`
- `--json`
- `--export`
- `--get`
- `--set-mode none|zod|json`
- `--add-field <spec>`
- `--remove-field <name>`
- `--set-field <spec>`
- `--rename-field <from:to>`
- `--servicesDir <dir>`
- `--force`
- `--dry`

## `add middleware <name>`

Génère un artefact middleware.

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
```

Targets supportées :

- `nitro`
- `feathers`
- `server-module`
- `module`
- `client-module`
- `hook`
- `policy`

## `add server-module <name>`

Génère directement un module serveur embedded dans `server/feathers/modules`.

```bash
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add server-module express-baseline --preset express-baseline
```

## `add mongodb-compose`

Génère un fichier `docker-compose-db.yaml` pour démarrer MongoDB localement.

```bash
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod add mongodb-compose --out docker-compose-db.yaml --service mongodb --database app --rootUser root --rootPassword change-me
```

## `mongo management`

Active ou met à jour la surface embedded MongoDB management dans `nuxt.config.*`.

```bash
bunx nuxt-feathers-zod mongo management   --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin   --enabled true   --auth false   --basePath /mongo
```

Flags utiles :

- `--url <mongodb-url>`
- `--enabled true|false`
- `--auth true|false`
- `--basePath <path>`
- `--exposeDatabasesService true|false`
- `--exposeCollectionsService true|false`
- `--exposeUsersService true|false`
- `--exposeCollectionCrud true|false`
- `--dry`

Routes canoniques exposées :

- `/mongo/databases` (alias legacy accepté : `/mongo`)
- `/mongo/<db>/collections`
- `/mongo/<db>/stats`
- `/mongo/<db>/<collection>/indexes`
- `/mongo/<db>/<collection>/count`
- `/mongo/<db>/<collection>/schema`
- `/mongo/<db>/<collection>/documents`
- `/mongo/<db>/<collection>/aggregate`

## Helpers OSS : templates, plugins, modules, middlewares

### `templates list`

Affiche les templates OSS disponibles.

```bash
bunx nuxt-feathers-zod templates list
```

### `plugins list` / `plugins add <name>`

```bash
bunx nuxt-feathers-zod plugins list
bunx nuxt-feathers-zod plugins add audit-log
```

Le générateur crée un plugin serveur Feathers basé sur `defineFeathersServerPlugin`.

### `modules list` / `modules add <name>`

```bash
bunx nuxt-feathers-zod modules list
bunx nuxt-feathers-zod modules add security-headers --preset security-headers
```

Le générateur crée un module serveur Feathers basé sur `defineFeathersServerModule`.

### `middlewares list` / `middlewares add <name>`

```bash
bunx nuxt-feathers-zod middlewares list --target nitro
bunx nuxt-feathers-zod middlewares add request-id --target nitro
```

## `doctor`

Diagnostic rapide du projet courant.

```bash
bunx nuxt-feathers-zod doctor
```

Le rapport couvre notamment :

- le mode client (`embedded` / `remote`)
- le transport remote et l’URL cible
- les `servicesDirs` détectés
- les services locaux scannés
- la configuration Keycloak remote
- la configuration Mongo management avec :
  - URL masquée
  - `basePath` normalisé
  - routes calculées
  - warning si `management.enabled = true` sans `database.mongo.url`
