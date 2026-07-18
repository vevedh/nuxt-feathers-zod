# CLI reference

This page is generated from the command tree exported by the CLI. The commands and options below therefore match the published module version.

```bash
bunx nuxt-feathers-zod --help
bunx nuxt-feathers-zod capabilities --section all --json
```

## Usage principles

- Run `doctor` after generation or a significant `nuxt.config.ts` change.
- Use `--dry` when available to inspect a patch before writing files.
- Use `--force` only when replacing an existing artifact is intentional.
- For business services, prefer `add service` or `add custom-service` over manually creating folders.
- The `schema --add-field` field format is `name:type!` for a required field, for example `title:string!`.

## Command catalogue

| Command | Purpose | Arguments and options |
|---|---|---|
| `add custom-service` | Explicit alias for a custom service without a standard adapter. | `<name>`<br>`--schema <none|zod|json>`<br>`--auth`<br>`--authAware`<br>`--path <value>`<br>`--methods <value>`<br>`--customMethods <value>`<br>`--docs`<br>`--servicesDir <value>`<br>`--force`<br>`--dry` |
| `add file-service` | Generate a local upload and download service. | `<name>`<br>`--path <value>`<br>`--storageDir <value>`<br>`--auth`<br>`--docs`<br>`--servicesDir <value>`<br>`--force`<br>`--dry` |
| `add middleware` | Generate middleware or another targeted server artifact. | `<name>`<br>`--target <nitro|route|feathers|server-module|module|client-module|hook|policy>`<br>`--force`<br>`--dry` |
| `add mongodb-compose` | Generate a development MongoDB Compose file. | `--out <value>`<br>`--service <value>`<br>`--port <value>`<br>`--database <value>`<br>`--rootUser <value>`<br>`--rootPassword <value>`<br>`--volume <value>`<br>`--force`<br>`--dry` |
| `add remote-service` | Declare a remote Feathers service in the client configuration. | `<name>`<br>`--path <value>`<br>`--methods <value>`<br>`--dry` |
| `add server-module` | Generate a Feathers/Nitro server module from a preset. | `<name>`<br>`--preset <helmet|security-headers|request-logger|healthcheck|rate-limit|express-baseline>`<br>`--force`<br>`--dry` |
| `add service` | Generate a Feathers service using memory, MongoDB, or a custom service class. | `<name>`<br>`--custom`<br>`--type <adapter|custom>`<br>`--adapter <memory|mongodb>`<br>`--schema <none|zod|json>`<br>`--auth`<br>`--authAware`<br>`--idField <id|_id>`<br>`--path <value>`<br>`--collection <value>`<br>`--methods <value>`<br>`--customMethods <value>`<br>`--docs`<br>`--servicesDir <value>`<br>`--force`<br>`--dry` |
| `auth service` | Enable or disable JWT hooks on an existing service. | `<name>`<br>`--servicesDir <value>`<br>`--enabled`<br>`--dry` |
| `capabilities` | Expose the capability matrix implemented by the installed package version. | `--section <summary|runtime|services|client|events|all>`<br>`--json` |
| `doctor` | Inspect the current project and report configuration or service inconsistencies. | — |
| `init embedded` | Configure Nuxt with a Feathers server embedded in Nitro. | `--framework <express|koa>`<br>`--servicesDir <value>`<br>`--restPath <value>`<br>`--websocketPath <value>`<br>`--websocketTransports <value>`<br>`--websocketConnectTimeout <value>`<br>`--websocketCorsOrigin <value>`<br>`--websocketCorsCredentials`<br>`--websocketCorsMethods <value>`<br>`--secureDefaults`<br>`--cors`<br>`--compression`<br>`--helmet`<br>`--bodyParserJson`<br>`--bodyParserUrlencoded`<br>`--serveStatic`<br>`--serveStaticPath <value>`<br>`--serveStaticDir <value>`<br>`--auth`<br>`--swagger`<br>`--serverModulesPreset <value>`<br>`--expressBaseline`<br>`--force`<br>`--dry` |
| `init remote` | Configure the Nuxt client for a remote Feathers API. | `--url <value> *`<br>`--transport <auto|rest|socketio>`<br>`--restPath <value>`<br>`--websocketPath <value>`<br>`--websocketTransports <value>`<br>`--websocketConnectTimeout <value>`<br>`--websocketCorsOrigin <value>`<br>`--websocketCorsCredentials`<br>`--websocketCorsMethods <value>`<br>`--auth`<br>`--payloadMode <jwt|keycloak>`<br>`--strategy <value>`<br>`--tokenField <value>`<br>`--servicePath <value>`<br>`--reauth`<br>`--force`<br>`--dry` |
| `init starter` | Copy the Nuxt 4 + Quasar 2 + UnoCSS + Pinia starter shipped with the package. | `--preset <value>`<br>`--dir <value>`<br>`--force`<br>`--dry` |
| `init templates` | Install customizable module templates. | `--dir <value>`<br>`--force`<br>`--diff`<br>`--dry` |
| `middlewares add` | Generate middleware from the preset registry. | `<name>`<br>`--target <nitro|route|feathers|server-module|module|client-module|hook|policy>`<br>`--force`<br>`--dry` |
| `middlewares list` | List middleware and targeted artifacts. | `--target <all|nitro|route|feathers|hook|policy|client-module|server-module|module>` |
| `modules add` | Generate a server module. | `<name>`<br>`--preset <helmet|security-headers|request-logger|healthcheck|rate-limit|express-baseline>`<br>`--force`<br>`--dry` |
| `modules list` | List detected server modules. | — |
| `mongo management` | Configure MongoDB management services exposed by the module. | `--url <value>`<br>`--enabled`<br>`--auth`<br>`--basePath <value>`<br>`--exposeDatabasesService`<br>`--exposeCollectionsService`<br>`--exposeUsersService`<br>`--exposeCollectionCrud`<br>`--whitelistDatabases <value>`<br>`--blacklistDatabases <value>`<br>`--whitelistCollections <value>`<br>`--blacklistCollections <value>`<br>`--showSystemDatabases`<br>`--allowCreateDatabase`<br>`--allowDropDatabase`<br>`--allowCreateCollection`<br>`--allowDropCollection`<br>`--allowInsertDocuments`<br>`--allowPatchDocuments`<br>`--allowReplaceDocuments`<br>`--allowRemoveDocuments`<br>`--dry` |
| `plugins add` | Generate a Feathers server plugin. | `<name>`<br>`--force`<br>`--dry` |
| `plugins list` | List detected server plugins. | — |
| `remote auth keycloak` | Configure Keycloak client mode for a remote backend. | `--ssoUrl, --url <value> *`<br>`--realm <value> *`<br>`--clientId <value> *`<br>`--dry` |
| `schema` | Inspect, validate, and modify a service schema manifest. | `<name>`<br>`--show`<br>`--get`<br>`--json`<br>`--export`<br>`--set-mode <none|zod|json>`<br>`--add-field <value>`<br>`--remove-field <value>`<br>`--set-field <value>`<br>`--rename-field <value>`<br>`--validate`<br>`--repair-auth`<br>`--servicesDir <value>`<br>`--dry`<br>`--diff`<br>`--force` |
| `templates init` | Install templates into the project. | `--dir <value>`<br>`--force`<br>`--diff`<br>`--dry` |
| `templates list` | List available templates. | — |

## Recommended workflows

### Embedded Feathers backend

```bash
bunx nuxt-feathers-zod init embedded --auth --framework express
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --auth
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
bunx nuxt-feathers-zod schema articles --add-field title:string!
bunx nuxt-feathers-zod doctor
```

### Custom service

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find --customMethods run --schema zod
```

### Remote client

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.test --transport socketio --auth
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bunx nuxt-feathers-zod doctor
```

## Source of truth

The `capabilities --json` command exposes implemented modes, transports, NFZ services, composables, and authentication events. The repository coherence gate compares this matrix with the runtime, playground, and documentation.

<!-- release-version: 6.5.49 -->
