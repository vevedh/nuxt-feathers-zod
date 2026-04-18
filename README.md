# nuxt-feathers-zod

> OSS reference snapshot: **v6.4.118** — optional Mongo management options aligned and release metadata synchronized.

[Documentation](https://vevedh.github.io/nuxt-feathers-zod/)

`nuxt-feathers-zod` is the official **Nuxt 4** module that embeds or connects to **FeathersJS v5 (Dove)** with a **CLI-first** workflow and optional **Zod-first** service generation.

Current OSS release target: **6.4.118**.

It supports two main usage patterns:

- **embedded mode**: a Feathers server runs inside Nuxt/Nitro
- **remote mode**: a Nuxt app uses a Feathers client against an external API

## Positioning vs `@nuxtjs/supabase`

`@nuxtjs/supabase` is an excellent Nuxt integration module for the Supabase platform: auth/session helpers, SSR-friendly composables and a very clear product story around Database/Auth/Storage/Realtime.

`nuxt-feathers-zod` aims at a different layer: it is a **backend-first Nuxt framework** for teams that want to run or connect to a Feathers v5 backend with a CLI-first workflow, typed services, custom hooks, enterprise auth compatibility and a path toward diagnostics/builder tooling.

The practical takeaway is simple:

- choose **Supabase** when your primary need is a managed BaaS already centered on Postgres, storage and realtime;
- choose **NFZ** when your primary need is a Nuxt-native full-stack architecture with Feathers services, custom business logic, embedded or remote runtime modes, and progressively richer operational tooling.

## Product demos and adoption path

The next DX milestone is not adding more low-level switches first. It is making NFZ easier to **understand in 5 minutes**.

The recommended public demo path is:

1. **auth demo** — login, logout, `reAuthenticate()`, current session and user state
2. **CRUD demo** — one concrete service with create/list/update/remove
3. **diagnostics demo** — lifecycle tracing, runtime summary and exported traces
4. **services manager demo** — manifest, preview, dry-run and apply
5. **builder studio demo** — preset-aware builder, CLI parity hint and NFZ-native apply checklist

This is the main difference in product strategy versus `@nuxtjs/supabase`: Supabase optimizes the perception of a managed platform, whereas NFZ should optimize the perception of a Nuxt-native backend framework with operational tooling.

## Open source scope

The public OSS module includes:

- Nuxt 4 + Nitro integration
- embedded and remote modes
- REST and Socket.IO transports
- embedded server with **Express** or **Koa**
- CLI bootstrap for `init embedded`, `init remote`, `init templates`
- CLI generation for services, remote services, plugins, modules, Nitro/route middleware and server modules
- schema modes `none | zod | json`
- local/JWT auth flows
- Keycloak SSO bridge for remote mode
- optional legacy Swagger support
- template overrides
- optional MongoDB management surface via `database.mongo.management`
- client-side helpers with Pinia / feathers-pinia support
- `doctor` diagnostics for mode, remote config, local services and Mongo management

## Create the Nuxt 4 app first

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
```

> For work inside the module repository itself, prefer `bun run clean:repo && bun install` over `bunx nuxi cleanup` before dependencies are installed.

## Installation

```bash
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

Optional Swagger dependencies:

```bash
bun add feathers-swagger swagger-ui-dist
```

## Quick start — embedded mode

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

## Embedded mode with local auth

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

## Remote mode quick start

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

## File upload/download starter

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

This generates a readable local file service scaffold with `find`, `get`, `remove`, `upload` and `download`.


## Recommended repo-dev flow for the module itself

When you work inside the **module repository**, prefer:

```bash
bun run clean:repo
bun install
```

and avoid running `bunx nuxi cleanup` before dependencies are installed.

## Canonical CLI commands

### Bootstrap and diagnostics

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm myrealm --clientId myapp
bunx nuxt-feathers-zod doctor
bunx nfz --help
```

### Services and schema

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --collection users --idField _id
bunx nuxt-feathers-zod add service users --auth --authAware --schema zod --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --set-mode zod
bunx nuxt-feathers-zod schema users --add-field title:string!
```

### Runtime helpers and scaffolding

```bash
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
```

### Secondary OSS helper commands

```bash
bunx nuxt-feathers-zod templates list
bunx nuxt-feathers-zod plugins list
bunx nuxt-feathers-zod plugins add audit-log
bunx nuxt-feathers-zod modules list
bunx nuxt-feathers-zod modules add security-headers --preset security-headers
bunx nuxt-feathers-zod middlewares list --target nitro
bunx nuxt-feathers-zod middlewares add request-id --target nitro
```

## CLI command surface in 6.4.118

| Area | Commands |
|---|---|
| Init | `init templates`, `init embedded`, `init remote` |
| Remote auth | `remote auth keycloak` |
| Services | `add service`, `add remote-service`, `auth service`, `schema` |
| Runtime scaffolding | `add middleware`, `schema`, `add server-module`, `add mongodb-compose`, `mongo management` |
| Secondary OSS helpers | `templates list`, `plugins list/add`, `modules list/add`, `middlewares list/add` |
| Diagnostics | `doctor` |


## Public CLI focus

The public OSS docs now foreground these commands as the **stable core**:

- `init embedded`
- `init remote`
- `remote auth keycloak`
- `add service <name>`
- `add remote-service <name>`
- `add middleware <name>`
- `schema <service>`
- `auth service <name>`
- `mongo management`
- `doctor`

The following commands remain supported, but are now treated as **secondary helpers or compatibility aliases** in the docs:

- `add custom-service <name>`
- `templates list` / `init templates`
- `plugins list|add`
- `modules list|add`
- `middlewares list|add`
- `add server-module <name>`
- `add mongodb-compose`

## Schema maintenance quick reference

```bash
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --validate
bunx nuxt-feathers-zod schema users --diff
bunx nuxt-feathers-zod schema users --repair-auth
```

Key `schema` flags:

- `--show` / `--json` / `--export`
- `--set-mode none|zod|json`
- `--add-field`, `--set-field`, `--remove-field`, `--rename-field`
- `--validate`
- `--repair-auth` for auth-enabled `users` baselines
- `--dry` / `--force`

## `add middleware` target matrix

| Target | Purpose | Status in docs |
|---|---|---|
| `nitro` | Nitro/H3 middleware | public |
| `route` | Nuxt route middleware in `app/middleware` | public |
| `feathers` | Feathers server plugin/middleware artifact | advanced |
| `server-module` | embedded Feathers server module | advanced |
| `module` | generic module artifact | advanced |
| `client-module` | client-side module artifact | advanced |
| `hook` | Feathers hook scaffold | advanced |
| `policy` | policy/guard scaffold | advanced |

## Auth-aware generation for `users`

For the `users` service, `--auth` and `--authAware` are distinct concerns:

- `--auth` protects service methods with JWT hooks
- `--authAware` enables local-auth-aware password handling

When generating `users --auth`, the CLI keeps an **auto-safe default** and enables auth-aware behavior unless it is explicitly disabled.

Auth-aware generation ensures the generated service handles password concerns consistently across `schema=none|zod|json` and `adapter=memory|mongodb`:

- hashes `password` with `passwordHash({ strategy: 'local' })`
- strips `password` from returned records/results
- persists the `authAware` state in the service manifest

Examples:

```bash
bunx nuxt-feathers-zod add service users --auth --schema none --adapter memory --force
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id --force
bunx nuxt-feathers-zod add service users --auth --authAware false --schema json --adapter memory --force
```

## Optional MongoDB management surface

The OSS core can expose an optional MongoDB management layer from the generated `feathers/server/mongodb.ts` template, backed by `feathers-mongodb-management-ts`.

Example:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: true,
          auth: true,
          basePath: '/mongo',
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeCollectionCrud: true,
        },
      },
    },
  },
})
```

This adds a controlled, opt-in management layer for:

- `/mongo/databases` (legacy alias accepted: `/mongo`)
- `/mongo/<db>/collections`
- `/mongo/<db>/stats`
- `/mongo/<db>/<collection>/indexes`
- `/mongo/<db>/<collection>/count`
- `/mongo/<db>/<collection>/schema`
- `/mongo/<db>/<collection>/documents`
- `/mongo/<db>/<collection>/aggregate`

`doctor` reports Mongo management settings with a normalized `basePath`, a computed route surface and a warning when management is enabled without `database.mongo.url`.

## Protecting an existing service after generation

```bash
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod auth service users --enabled false
```

## Generating a local MongoDB Docker Compose file

```bash
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod add mongodb-compose --out docker-compose-db.yaml --database app --rootPassword secret --force
```

## Remote + Keycloak runtime contract

In **remote mode** with **Keycloak SSO**, NFZ applies a two-step client contract.

### Step 1 — immediate local Feathers session hydration

As soon as Keycloak is authenticated in the browser, the client auth store is hydrated immediately:

```ts
authStore.authenticated = true
authStore.accessToken = keycloak.token
authStore.user = ssoUser
```

This guarantees that:
- Nuxt route middleware can consider the user authenticated
- client service calls receive `Authorization: Bearer <keycloak token>`
- the local runtime stays coherent even before the remote Feathers API confirms the token

### Step 2 — remote authentication handshake

NFZ then attempts a remote Feathers authentication call using the configured remote strategy:

```ts
await api.authenticate({
  strategy: 'sso', // or another configured remote.auth.strategy
  accessToken: keycloak.token,
  access_token: keycloak.token,
  token: keycloak.token,
  user: ssoUser,
  authenticated: true,
})
```

The actual strategy name comes from `feathers.client.remote.auth.strategy`.

Example:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'sso',
          tokenField: 'access_token',
          servicePath: 'authentication',
        },
      },
    },
    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'myrealm',
      clientId: 'myapp',
    },
  },
})
```

### Resulting semantics in `useAuth()`

In provider `keycloak`, `useAuth()` now exposes distinct states:

- `isSsoAuthenticated`
- `isFeathersAuthenticated`
- `isAuthenticated`
- `ssoUser`
- `feathersUser`
- `user`
- `ssoToken`
- `feathersToken`
- `token`

Resolution rules:

- `user = feathersUser ?? ssoUser`
- `token = feathersToken ?? ssoToken`

### Backend requirement

For protected remote services to be truly accepted by Feathers hooks such as `authenticate('jwt')`, the remote backend must accept the token and strategy you configure.

Typical options:
- validate the Keycloak token directly through the Feathers authentication strategy
- expose a dedicated remote strategy such as `strategy: 'sso'`

If the backend refuses the handshake, NFZ keeps the local client state coherent and preserves the error in the auth store for diagnostics.

## Notes

- Recommended convention: `servicesDirs: ['services']`
- Recommended path: **CLI-first**
- In remote mode, `transport: auto` resolves to **socketio** in the current OSS runtime
- Historical aliases may remain supported for backward compatibility, but the public docs foreground canonical commands only
- Maintainer-only publication and admin procedures are kept in `README_private.md` and intentionally excluded from the public repository surface

## License

MIT


### Consumer-safe server modules

Built-in NFZ Express/Koa server modules are resolved via package subpath exports in consumer apps:

- `nuxt-feathers-zod/server/modules/express/*`
- `nuxt-feathers-zod/server/modules/koa/*`

Local source fallbacks are only used while developing the NFZ repository itself.


## Release 6.4.0

This release hardens the CLI patcher for remote mode so chained commands keep `nuxt.config.ts` valid in consumer Nuxt 4 apps, especially for Keycloak remote auth and remote service registration on Windows.


- 6.4.1: Added automatic Keycloak `js-sha256` default-export shim alias for consumer Nuxt 4 apps to avoid browser crash from `keycloak-js` importing `js-sha256` as a default export.

### Remote Keycloak `strategy: 'sso'` with option B

When the remote backend expects `api.authenticate({ strategy: 'sso', user: loginuser, authenticated: true })`, NFZ now keeps the local SSO object in the auth store (`authStore.user = ssoUser`) but sends only the derived login string as `user` in the remote authenticate payload.


## Builder Studio and presets (6.4.62)

NFZ now documents a more demonstrable builder flow:

- official builder presets (`mongoCrud`, `mongoSecureCrud`, `memoryCrud`, `action`)
- a dedicated builder demo page in the app/test workspace
- direct routing into `/services-manager?preset=...`
- clearer NFZ-native file layout preview before apply


## Builder Studio 6.4.63

- barrels optionnels : `index.ts` dans le dossier service, et en option `services/index.ts`
- starter `users` rapproché des conventions NFZ local auth (`passwordHash`, masquage du mot de passe côté external resolver)
- apply builder plus proche d’un layout de démonstration CLI-first


## 6.4.64

- Builder Studio: `services/index.ts` peut maintenant être agrégé à partir de plusieurs services marqués `service+root`.
- Le preview et l'apply utilisent la liste complète du manifest pour produire un root barrel cohérent avec plusieurs services.


## 6.4.65
Le parcours **Services Manager** distingue désormais plus clairement les services **Démo builder**, les **Services scannés** et les **Brouillons libres**, afin de rendre les tests simples plus compréhensibles dans l'app de démonstration.

## 6.4.66

- Builder Studio : les **presets officiels** sortent du flux long du formulaire et passent dans un **onglet dédié `Presets`** pour rester visibles et accessibles sans scroll important.
- Les **starters métier** sont présentés dans ce même espace pour des tests simples et compréhensibles.


## 6.4.67

- Builder Studio : filtre rapide **Tous / Démo / Scannés / Brouillons** dans le sidebar pour isoler les familles de services.
- Onglet `Presets` : zone presets/starters désormais scrollable localement avec `max-h-[56vh] overflow-auto`.

## 6.4.68

- Builder Studio: new pedagogical **view modes** make the screen easier to understand on first use:
  - `Quick tests`
  - `Real services`
  - `Advanced builder`
- These modes drive the builder focus (demo presets vs scanned services vs full workspace flow).

## 6.4.69

- Services Manager ajoute trois cartes d’entrée guidées : tests rapides, services réels et builder avancé.
- Le parcours devient plus lisible avant même d’ouvrir les onglets Workflow / Presets / Workspace.


## NFZ Studio Docker Edition

Le dashboard de démonstration associé au module peut désormais être packagé comme **produit Docker** avec :
- `NFZ_DATA_DIR` pour la persistance du manifest builder et des diagnostics
- `NFZ_WORKSPACE_DIR` pour le scan et l'apply du builder sur un workspace monté
- `NFZ_BUILDER_APPLY_MODE` (`workspace`, `export-only`, `readonly`)
- un scaffold licence exposé via `/api/license/status` et une page dashboard `/license`
- `Dockerfile`, `docker-compose.yaml` et `.env.example` prêts à l'emploi dans l'app de test

> Note : la couche licence incluse à ce stade est un **scaffold UX/runtime**. Elle prépare l'édition Docker licenciée, mais ne remplace pas encore une signature cryptographique serveur/public key.


## License Center

The Docker Edition can expose a reusable `License Center` page and feature-gating components to manage future licensed options for the `nuxt-feathers-zod` product surface.


## 6.4.87 — License Center layout clarity
- La page /license-center côté dashboard de démonstration a été refondue pour une lecture plus claire et sans écrasement responsive.
- Nouveau découpage : status + quick actions + runtime summary en haut, puis onglets Overview / Features / Plans.
- Le breakpoint de colonnes latérales a été repoussé à 2xl pour éviter les défauts de mise en page sur desktop intermédiaire.


## PATCH 6.4.93 auth runtime refactor (phase 2)

- Added official protected runtime helpers: `useAuthenticatedRequest()` and `useProtectedService()`.
- Added `useAuthDiagnostics()` and `getStateSnapshot()` for easier auth diagnostics.
- Generated remote client plugin now synchronizes remote authenticate / reAuthenticate results with the unified auth runtime instead of only syncing a Pinia store.
- Documentation FR/EN updated around the unified auth runtime, protected requests, protected services and Keycloak bridge behavior.
- Recommended rule: protected NFZ tools must stop rebuilding Bearer headers manually and should consume the runtime helpers.

## PATCH 6.4.92 auth runtime refactor (phase 1)

- Unified client auth runtime added via `useAuthRuntime()`.
- Single source of truth for token/user/authenticated/ready/status.
- Keycloak SSO now syncs token and Keycloak user through a dedicated bridge flow before protected Feathers calls.
- Generated Keycloak bridge service now accepts token aliases and keycloak user hints, and returns `accessToken`/`authentication` in its result.
- Goal: eliminate auth drift between `$api`, raw Feathers client, Pinia auth store, storage, and runtime tools.



## Unified auth runtime helpers

`6.4.94` adds a stronger phase-3 runtime auth layer for protected REST/service flows:

- `useAuthRuntime()` remains the single auth source of truth
- `useAuthBoundFetch()` provides an auth-aware fetch helper with automatic bearer injection and one-shot `reAuthenticate()` retry on 401
- `useAuthenticatedRequest()` now delegates to this helper
- `useProtectedService()` retries once after `reAuthenticate()` on 401
- generated REST Feathers clients now use the auth-bound fetch implementation by default

This is especially useful for embedded REST mode, remote JWT mode, and Keycloak SSO bridging where a single runtime token must be reused consistently across Feathers services and protected HTTP routes.


## 6.4.95

- auth runtime refactor phase 4
- official protected tool helpers: `useProtectedTool()` and `useMongoManagementClient()`
- public runtime metadata for embedded Mongo management routes
- better alignment between protected Feathers services and protected runtime tool HTTP routes

## 6.4.96

- auth runtime refactor phase 5: official Keycloak bridge helper `useKeycloakBridge()`
- richer runtime diagnostics (`lastBridgeAt`, `lastEnsureReason`, `bridgePath`, `clientSync`)
- `useAuthBoundFetch()` and `useProtectedService()` now explicitly validate the Keycloak bearer before protected calls

> Embedded Mongo management routes are resolved behind the embedded REST prefix. Example: REST path `/feathers` + Mongo base path `/mongo` results in client calls to `/feathers/mongo/...`.


## Module repo cleanup

In the module repository itself, prefer `bun run clean:repo` before `bun install`. Running `bunx nuxi cleanup` before dependencies are installed can fail because `@nuxt/kit` is not available yet.
## 6.4.110 — Admin diagnostics/devtools helper

`useNfzAdminClient()` is now available to consume NFZ diagnostics and DevTools surfaces through the same auth-aware runtime path used by Mongo management.


- 6.4.117: fixed invalid YAML front matter in `docs/en/guide/auth-keycloak.md`; added GitHub Pages/VitePress deployment note (`docs/guide/github-pages.md`).
