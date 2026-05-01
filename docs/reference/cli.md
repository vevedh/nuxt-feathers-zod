# Référence CLI

Cette page documente les commandes publiques du CLI `nuxt-feathers-zod`.

Le contenu ci-dessous est aligné sur l’aide intégrée du CLI dans `src/cli/core.ts`.

## Commande d’entrée

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
```

Alias :

```bash
bunx nfz <command> [args] [--flags]
```

## Aide complète

```txt
nuxt-feathers-zod CLI

Usage:
  bunx nuxt-feathers-zod <command> [args] [--flags]

Commands:
  init templates                Initialize template overrides (default: feathers/templates)
  init embedded                 Initialize embedded server mode (Feathers inside Nuxt/Nitro)
  init remote                   Initialize remote client mode (Feathers client -> external server)
  init starter                  Scaffold Nuxt 4 + Quasar 2 + UnoCSS + Pinia + NFZ starter
  remote auth keycloak          Configure remote auth payload mode for Keycloak
  add service <name>            Generate an embedded service (or a service with custom methods via --custom)
  add file-service <name>       Generate a local upload/download file service scaffold
  add remote-service <name>     Register a remote service (client-only)
  add middleware <name>         Generate middleware or middleware-like artifacts
  add mongodb-compose           Generate docker-compose-db.yaml for MongoDB
  mongo management             Enable/update embedded MongoDB management routes
  schema <service>              Inspect schema state or switch schema mode
  auth service <name>           Enable/disable JWT auth hooks on an existing service
  doctor                        Diagnose current project configuration

Global flags (most commands):
  --dry                         Dry run (no writes)
  --force                       Overwrite existing files (generators)

Notes:
  - The CLI auto-patches nuxt.config.* to ensure:
    - modules: [..., 'nuxt-feathers-zod']
    - feathers: { ... } minimal defaults required by the chosen command
  - Embedded: generate services via CLI (recommended), then test REST:
      GET http://localhost:3000/feathers/<service>
  - MongoDB adapter requires an embedded mongodbClient (see docs). Default adapter is memory.

Examples:
  bunx nuxt-feathers-zod init templates
  bunx nuxt-feathers-zod init embedded --force
  bunx nuxt-feathers-zod init embedded --force --auth
  bunx nuxt-feathers-zod add service users
  bunx nuxt-feathers-zod add service users --adapter mongodb --collection users
  bunx nuxt-feathers-zod add service actions --custom --methods find,get --customMethods run,preview
  bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
  bunx nuxt-feathers-zod init remote --url http://localhost:3030
  bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
  bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport rest
  bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
  bunx nuxt-feathers-zod add mongodb-compose
  bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
  bunx nuxt-feathers-zod auth service users --enabled true
  bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example --realm myrealm --clientId myapp
  bunx nuxt-feathers-zod doctor

Flags overview:

  init templates:
    --dir <dir>                (default: feathers/templates)
    --force
    --dry
    --diff                      show manifest diff before applying changes

  init embedded:
    --framework express|koa      (default: express)
    --servicesDir <dir>          (default: services)
    --restPath <path>            (default: /feathers)
    --websocketPath <path>       (default: /socket.io)
    --websocketTransports <list> (ex: websocket,polling)
    --websocketConnectTimeout <ms> (default: 45000)
    --websocketCorsOrigin <value> (ex: true|*|https://app.example.com)
    --websocketCorsCredentials true|false
    --websocketCorsMethods <list> (ex: GET,POST)
    --secureDefaults true|false  (default: true)
    --cors true|false            (default: true)
    --compression true|false     (default: true)
    --helmet true|false          (default: true)
    --bodyParserJson true|false  (default: true)
    --bodyParserUrlencoded true|false (default: true)
    --serveStatic true|false     (default: false)
    --serveStaticPath <path>     (default: /)
    --serveStaticDir <dir>       (default: public)
    --serverModulesPreset <name> (ex: express-baseline)
    --expressBaseline            scaffold Express baseline server modules
    --auth true|false            (default: false)
    --swagger true|false         (default: false)
    --force
    --dry

  init remote:
    --url <http(s)://...>       (required)
    --transport socketio|rest|auto (default: socketio, auto resolves to socketio in remote mode)
    --restPath <path>           (default: /feathers)
    --websocketPath <path>      (default: /socket.io)
    --websocketTransports <list> (ex: websocket,polling)
    --websocketConnectTimeout <ms> (default: 45000)
    --websocketCorsOrigin <value>
    --websocketCorsCredentials true|false
    --websocketCorsMethods <list>
    --auth true|false           (default: false)
    --payloadMode jwt|keycloak  (default: jwt)
    --strategy jwt              (default: jwt)
    --tokenField accessToken    (default: accessToken, access_token when --payloadMode keycloak)
    --servicePath authentication (default: authentication)
    --reauth true|false         (default: true)
    --force
    --dry

  remote auth keycloak:
    --ssoUrl <url>              (required)
    --realm <realm>             (required)
    --clientId <id>             (required)
    --dry

  add service <name>:
    --custom                    generate an adapter-less service with custom methods
    --type adapter|custom       explicit service kind (optional)
    --adapter memory|mongodb    (default: memory; ignored for --custom)
    --schema none|zod|json      (default: none)
    --auth true|false           (default: false)
    --idField id|_id            (default: id; mongodb default: _id; ignored for --custom)
    --path <servicePath>        (default: /<name>)
    --collection <name>         (mongodb only; ignored for --custom)
    --methods find,get,create,patch,remove (custom only; optional)
    --customMethods run,preview (custom only; optional)
    --docs true|false           (default: false; swagger legacy)
    --servicesDir <dir>         (default: services)
    --force
    --dry

  add file-service <name>:
    --path <servicePath>        (default: <name>)
    --storageDir <dir>          (default: storage/<name>)
    --auth true|false           (default: false)
    --docs true|false           (default: true)
    --servicesDir <dir>         (default: services)
    --force
    --dry

  add remote-service <name>:
    --path <servicePath>        (default: <name>)
    --methods find,get,create,patch,remove,custom (optional)
    --dry

  add mongodb-compose:
    --out <file>                (default: docker-compose-db.yaml)
    --service <name>            (default: mongodb)
    --port <port>               (default: 27017)
    --database <name>           (default: app)
    --rootUser <user>           (default: root)
    --rootPassword <pass>       (default: change-me)
    --volume <name>             (default: mongodb_data)
    --force
    --dry

  auth service <name>:
    --servicesDir <dir>         (default: services)
    --enabled true|false        (default: true)
    --dry

  mongo management:
    --url <mongodb-url>         set/update feathers.database.mongo.url
    --enabled true|false        management.enabled (default: true)
    --auth true|false           management.auth (default: true)
    --basePath <path>           management.basePath (default: /mongo)
    --exposeDatabasesService true|false   management.exposeDatabasesService (default: true)
    --exposeCollectionsService true|false management.exposeCollectionsService (default: true)
    --exposeUsersService true|false       management.exposeUsersService (default: false)
    --exposeCollectionCrud true|false     management.exposeCollectionCrud (default: true)
    --whitelistDatabases <csv>  management.whitelistDatabases
    --blacklistDatabases <csv>  management.blacklistDatabases
    --whitelistCollections <csv> management.whitelistCollections
    --blacklistCollections <csv> management.blacklistCollections
    --showSystemDatabases true|false      management.showSystemDatabases (default: false)
    --allowCreateDatabase true|false      management.allowCreateDatabase (default: false)
    --allowDropDatabase true|false        management.allowDropDatabase (default: false)
    --allowCreateCollection true|false    management.allowCreateCollection (default: false)
    --allowDropCollection true|false      management.allowDropCollection (default: false)
    --allowInsertDocuments true|false     management.allowInsertDocuments (default: false)
    --allowPatchDocuments true|false      management.allowPatchDocuments (default: false)
    --allowReplaceDocuments true|false    management.allowReplaceDocuments (default: false)
    --allowRemoveDocuments true|false     management.allowRemoveDocuments (default: false)
    --dry

  add middleware <name>:
    --target nitro|route|feathers|server-module|module|client-module|hook|policy (default: nitro)
    --force
    --dry

  schema <service>:
    --show                      human-readable schema summary
    --json                      machine-readable schema summary
    --export                    write schema summary to services/.nfz/exports
    --get                       compatibility alias of --show
    --set-mode none|zod|json    switch schema mode
    --add-field <spec>          add field (ex: userId:string!, isActive:boolean=true)
    --remove-field <name>       remove field from manifest/schema
    --set-field <spec>          create or replace field definition
    --rename-field <from:to>    rename field preserving definition
    --validate                  validate manifest/schema coherence
    --repair-auth               repair auth-compatible users schema baseline
    --servicesDir <dir>         (default: services)
    --force
    --dry

  add server-module <name>:
    --preset helmet|security-headers|request-logger|healthcheck|rate-limit|express-baseline
    --force
    --dry
```

## Bonnes pratiques CLI

- Utilise `--dry` avant une opération qui modifie plusieurs fichiers.
- Utilise `--force` seulement lorsque tu acceptes l’écrasement.
- Garde `servicesDirs: ['services']` sauf raison explicite.
- Préfère `add service` à la création manuelle du premier service.
- Lance `doctor` après une migration ou un changement de mode.
- Pour MongoDB management, garde `--auth true` en dehors d’un environnement local isolé.


<!-- release-version: 6.5.29 -->
