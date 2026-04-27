---
editLink: false
---
# CLI

La CLI `bunx nuxt-feathers-zod` est la **méthode officielle** pour initialiser une app Nuxt 4, générer les artefacts du module et diagnostiquer un projet existant.

Cette page aligne la documentation publique sur la surface CLI OSS stabilisée pour la release **6.5.20**.

## Commande d’entrée

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

## Surface CLI OSS officielle

### Noyau public recommandé

- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add remote-service <name>`
- `add file-service <name>`
- `add middleware <name>`
- `schema <service>`
- `auth service <name>`
- `mongo management`
- `doctor`

### Commandes secondaires / alias de compatibilité

- `add custom-service <name>`
- `init templates`
- `templates list`
- `plugins list|add`
- `modules list|add`
- `middlewares list|add`
- `add server-module <name>`
- `add mongodb-compose`


### Initialisation

- `init templates`
- `init embedded`
- `init remote`
- `remote auth keycloak`

### Génération et maintenance des services

- `add service <name>`
- `add service <name> --custom`
- `add remote-service <name>`
- `add file-service <name>`
- `auth service <name>`
- `schema <service>`

### Runtime public core

- `add middleware <name>`
- `mongo management`

### Runtime advanced / secondary

- `add server-module <name>`
- `add mongodb-compose`

### Helpers OSS secondaires : templates/modules/plugins/middlewares

- `templates list`
- `plugins list`
- `plugins add <name>`
- `modules list`
- `modules add <name>`
- `middlewares list`
- `middlewares add <name>`

### Diagnostic

- `doctor`


## Différences entre `plugin`, `server-module`, `module`, `client-module`, `hook`, `policy`

Ces cibles ne servent pas au même niveau du runtime NFZ. Le bon critère est : **où le fichier est généré, quand il s'exécute, et quel problème il résout**.

### `plugin`

Un `plugin` est un **plugin serveur Feathers global**.

Commande CLI associée :

```bash
bunx nuxt-feathers-zod plugins add audit-bootstrap
```

Fichier généré :

```txt
server/feathers/audit-bootstrap.ts
```

Quand l'utiliser :
- pour brancher une logique globale sur l'application Feathers
- pour enregistrer des `app.hooks({ setup: [...] })`
- pour un bootstrap transverse côté serveur

Exemple d'utilisation :

```ts
import { auditBootstrap } from '~/server/feathers/audit-bootstrap'

export default defineNitroPlugin(async () => {
  // votre runtime NFZ charge le plugin côté serveur
})
```

Cas typique : journalisation globale, métriques, bootstrap de hooks applicatifs.

### `server-module`

Un `server-module` est un **module d'infrastructure serveur** chargé autour du runtime Feathers/Nitro.

Commande CLI associée :

```bash
bunx nuxt-feathers-zod add server-module security-headers
```

Fichier généré :

```txt
server/feathers/modules/security-headers.ts
```

Quand l'utiliser :
- pour ajouter des headers HTTP
- pour brancher `helmet`, rate-limit, healthcheck, request logger
- pour toucher à la couche serveur plus qu'à la logique métier Feathers

Exemple d'utilisation :

```ts
export default async function securityHeaders(app: any) {
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Frame-Options', 'DENY')
    next()
  })
}
```

Cas typique : sécurité HTTP, endpoints de santé, middlewares Express/Koa.

### `module`

`module` est aujourd'hui **un alias pratique de `server-module`** dans la CLI.

Commande CLI associée :

```bash
bunx nuxt-feathers-zod add middleware request-logger --target module
```

Fichier généré :

```txt
server/feathers/modules/request-logger.ts
```

Quand l'utiliser :
- si tu préfères la forme courte `module`
- sinon privilégie `server-module`, plus explicite dans la doc

Exemple d'utilisation :

```bash
bunx nuxt-feathers-zod add middleware healthcheck --target module
```

Même famille d'usage que `server-module`.

### `client-module`

Un `client-module` est un **plugin Nuxt client** chargé uniquement dans le navigateur.

Commande CLI associée :

```bash
bunx nuxt-feathers-zod add middleware api-debug --target client-module
```

Fichier généré :

```txt
app/plugins/api-debug.client.ts
```

Quand l'utiliser :
- pour enrichir `$api`
- pour brancher du diagnostic client
- pour ajouter de la télémétrie côté navigateur

Exemple d'utilisation :

```ts
export default defineNuxtPlugin((nuxtApp) => {
  console.info('[nfz] client module ready', !!nuxtApp.$api)
})
```

Cas typique : debug du client Feathers, instrumentation front, helpers browser-only.

### `hook`

Un `hook` est une **fonction réutilisable de hook Feathers**.

Commande CLI associée :

```bash
bunx nuxt-feathers-zod add middleware attach-tenant --target hook
```

Fichier généré :

```txt
server/feathers/hooks/attach-tenant.ts
```

Quand l'utiliser :
- pour enrichir `context.params`
- pour transformer `context.data`
- pour centraliser une logique before/after/around réutilisable

Exemple d'utilisation :

```ts
import { attachTenant } from '../hooks/attach-tenant'

export const before = {
  all: [attachTenant()]
}
```

Cas typique : multi-tenant, normalisation des données, enrichissement du contexte.

### `policy`

Une `policy` est un **guard d'autorisation** spécialisé.

Commande CLI associée :

```bash
bunx nuxt-feathers-zod add middleware is-admin --target policy
```

Fichier généré :

```txt
server/feathers/policies/is-admin.ts
```

Quand l'utiliser :
- pour autoriser/refuser explicitement
- pour centraliser une règle RBAC
- pour protéger un service ou une méthode

Exemple d'utilisation :

```ts
import { isAdminPolicy } from '../policies/is-admin'

export const before = {
  all: [isAdminPolicy()]
}
```

Cas typique : admin-only, same-user-or-admin, contrôles d'accès métier.

### Résumé pratique

- `plugin` : extension globale Feathers serveur
- `server-module` : extension serveur/infrastructure
- `module` : alias de `server-module`
- `client-module` : plugin Nuxt client
- `hook` : logique de hook Feathers réutilisable
- `policy` : hook spécialisé en autorisation

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
bun add nuxt-feathers-zod
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
bun add nuxt-feathers-zod feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --auth --swagger
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod --collection users --idField _id --docs
bun dev
```

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

### Remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod
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
- en embedded navigateur, `transport: auto` privilégie désormais **REST**
- en remote, `transport: auto` privilégie **socketio** si disponible, sinon retombe sur **REST**
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

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

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

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

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

Génère un artefact middleware. Les cibles supportées incluent les middlewares Nitro, les middlewares de route Nuxt, les plugins Feathers, les hooks, les policies et les server modules embedded.

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```

Targets supportées :

- **publiques recommandées** : `nitro`, `route`
- **avancées** : `feathers`, `server-module`, `module`, `client-module`, `hook`, `policy`

La documentation publique recommande de commencer par `nitro` et `route`. Les autres targets restent supportées mais visent surtout des besoins experts ou internes de scaffolding.

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

<!-- mongodb-compose-purpose-note -->
> Cette commande crée un `docker-compose.yaml` prêt à lancer une base MongoDB en écoute pour les services générés avec `--adapter mongodb`.

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


Options supplémentaires de `mongo management` alignées sur `feathers.database.mongo.*` :

- `--whitelistDatabases <csv>` → `feathers.database.mongo.management.whitelistDatabases`
- `--blacklistDatabases <csv>` → `feathers.database.mongo.management.blacklistDatabases`
- `--whitelistCollections <csv>` → `feathers.database.mongo.management.whitelistCollections`
- `--blacklistCollections <csv>` → `feathers.database.mongo.management.blacklistCollections`
- `--showSystemDatabases true|false` → `feathers.database.mongo.management.showSystemDatabases`
- `--allowCreateDatabase true|false` → `feathers.database.mongo.management.allowCreateDatabase`
- `--allowDropDatabase true|false` → `feathers.database.mongo.management.allowDropDatabase`
- `--allowCreateCollection true|false` → `feathers.database.mongo.management.allowCreateCollection`
- `--allowDropCollection true|false` → `feathers.database.mongo.management.allowDropCollection`
- `--allowInsertDocuments true|false` → `feathers.database.mongo.management.allowInsertDocuments`
- `--allowPatchDocuments true|false` → `feathers.database.mongo.management.allowPatchDocuments`
- `--allowReplaceDocuments true|false` → `feathers.database.mongo.management.allowReplaceDocuments`
- `--allowRemoveDocuments true|false` → `feathers.database.mongo.management.allowRemoveDocuments`

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
- l’auth locale embedded avec :
  - `auth.enabled`
  - `auth.authStrategies`
  - `auth.local.usernameField`
  - `auth.local.entityUsernameField`
  - un exemple de payload local compatible Feathers
  - un warning si la cartographie requête ↔ entité diverge (dans ce cas, utiliser `buildLocalAuthPayload()` ou `runtimeConfig.public._feathers.auth.local`)
- la configuration Keycloak remote
- la configuration Mongo management avec :
  - URL masquée
  - `basePath` normalisé
  - routes calculées
  - warning si `management.enabled = true` sans `database.mongo.url`


## Starter upload/download de fichiers

Commande dédiée :

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```


## 6.4.124

- `doctor` couvre maintenant la cartographie locale embedded (`usernameField`, `entityUsernameField`, etc.) et imprime un exemple de payload local compatible Feathers.
- un warning explicite apparaît si les champs de requête et d’entité divergent, afin d’orienter l’UI vers `buildLocalAuthPayload()` ou `runtimeConfig.public._feathers.auth.local`.

## 6.4.121

- Documentation clarifiée : chaque exemple utilisant `--adapter mongodb` rappelle maintenant qu'une base MongoDB active est nécessaire, et qu'on peut générer rapidement un `docker-compose.yaml` avec `bunx nuxt-feathers-zod add mongodb-compose`.
