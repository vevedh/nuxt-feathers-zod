## v6.4.19

- Release-consistency stabilization: docs/version markers aligned on 6.4.19, CLI build wrapped in Node for Windows/npm predictability, and release metadata sanity check added.

## v6.4.11

- docs: added a complete Nuxt 4 remote + Keycloak example page with `auth-keycloak` route middleware and a remote `messages` service call
- docs: linked the new guide from remote/keycloak pages and VitePress sidebar (FR/EN)
- docs: updated README and project journals to reflect the new reference scenario

[v6.4.5] Fixed consumer-safe Keycloak/js-sha256 aliasing by using an exact Vite alias /^js-sha256$/ only.

[v6.4.4] CLI typecheck/test cleanup applied.

- 6.3.10: consumer-safe server module resolution fix for published package exports (Express/Koa builtins now resolve through package subpath exports in installed Nuxt apps).
## 2026-03-16 — Release v6.3.9 exports + docs alignment

- Bumped official release target from `6.3.8` to `6.3.9`.
- Updated `package.json`, `README.md`, `CHANGELOG.md`, and public CLI docs for the official `6.3.9` publication.
- Carried forward the `dist/` export-map fix for consumer Nuxt 4 applications so builtin NFZ server modules no longer resolve to `src/`.

## 2026-03-16 — Release v6.3.8 CLI packaging + alias nfz

- Fixed published CLI packaging for consumer Nuxt 4 apps: the built binary now runs without requiring explicit options.
- Added `nfz` as an alias binary alongside `nuxt-feathers-zod`.
- Updated `src/cli/bin.ts`, `src/cli/index.ts`, `src/cli/core.ts`, `package.json`, README, tests, and changelog for the official `6.3.8` release.

## 2026-03-15 — Release v6.3.7 publication prep

- Bumped official release target from `6.3.5` to `6.3.7`.
- Updated `package.json`, `README.md`, CLI reference pages, and release checklist for the official `6.3.7` publication.
- Carried forward the validated OSS base including embedded Mongo management, enriched CLI, docs build fixes, and NFZ DevTools parent-theme synchronization.

## 2026-03-15 — Patch OSS-6K release-docs alignment for official 6.3.5

### Goal
- Align public documentation with the current OSS CLI surface and stabilize the repository for an official `6.3.5` publication.

### Applied changes
- bumped `package.json` version to `6.3.5`
- refreshed `README.md` with the canonical CLI surface and 6.3.5 release target
- rewrote `docs/guide/cli.md`, `docs/reference/cli.md`, and `docs/en/guide/cli.md` so they document:
  - init / remote auth / services / schema / runtime helpers
  - Mongo management
  - templates / plugins / modules / middlewares helper commands
  - doctor diagnostics
- refreshed `AI_CONTEXT/CLI_REFERENCE.md`
- extended the public release checklist with a 6.3.5 documentation-alignment gate

### Notes
- This patch is documentation/release stabilization only; it does not change runtime behavior.

## 2026-03-15 — Patch OSS-6G1 CLI test stability for auth-aware users variants
- Refactored the heavy CLI generator test into per-combination `it.each(...)` cases instead of a single long loop.
- Reduced false negatives on Bun + Windows by assigning a timeout per variant rather than a shared 20s budget across all combinations.
- Preserved the same coverage across schema=`none|zod|json` and adapter=`memory|mongodb`.


- Added a Nitro middleware bridge for embedded Express REST under `/feathers/**`.
- Purpose: avoid Nuxt HTML/page fallback on direct browser requests to Feathers REST endpoints such as `/feathers/mongo (legacy alias: /feathers/mongo/databases)`.

## P7 consolidated baseline

Reference archive status after consolidation:
- includes previous Express server-modules work
- includes Koa server-modules runtime family
- includes Socket.IO runtime + advanced CLI websocket flags
- suitable baseline before continuing on auth payload / embedded vs remote transport parity

# Project Context — nuxt-feathers-zod

nuxt-feathers-zod (NFZ) is a Nuxt 4 module integrating FeathersJS v5 (Dove)
with Zod-first schema validation and DevOps tooling.

Capabilities:

- Embedded Feathers server inside Nuxt Nitro
- Remote Feathers client mode
- CLI generators for services
- Middleware generators
- Server modules system
- VitePress documentation
- Bun-first tooling
- Pinia integration

Stack:

Nuxt 4  
FeathersJS v5 (Dove)  
Zod  
Bun  
Pinia  
VitePress

Goal:

Create a DevOps-ready framework combining:

Nuxt + Feathers + CLI generators + DevTools + Builder UI
- Fix7a/fix8: corrected framework-aware builtin server module resolution on Windows by resolving explicit `.ts` files for builtins (`express/*`, `koa/*`) before `scanExports`, fixing ENOENT on `body-parser`, `serve-static`, etc.


## PATCH fix9
- Fixed published package builtin server modules resolution: builtins are now resolved from `src/runtime/server/modules/*` at package root instead of `dist/runtime/server/modules/*`.
- Added `src/runtime/server/modules` to published package `files` so installed Nuxt apps can resolve Express/Koa builtins during `nuxt prepare` and build on Windows and other platforms.

- fix10: corrected generated preset module `healthcheck.ts` in CLI templates; removed regex-based `basePath.replace(/\/$/, ...)` which lost its backslash in generated output and broke Nitro/esbuild parsing in consumer Nuxt apps. Now uses `endsWith('/')` concatenation.

## PATCH fix11
- Template safety stabilization: corrected remaining nested template interpolation in CLI-generated `healthcheck.ts` preset module.
- Generated code now uses string concatenation (`basePath + '/health'`) instead of nested template literals inside the emitter template, preventing silent runtime generation bugs.
- Added `scripts/template-safety-check.mjs` and `bun run sanity:templates` to catch this class of fragile template regressions early.



## PATCH 12 - Socket.IO auth payload alignment
- unified remote auth payload construction via runtime helper `buildRemoteAuthPayload`
- normalized access token extraction via `getAccessTokenFromResult`
- remote auth startup/reconnect now explicitly re-authenticates on Socket.IO when a token is available
- remote auth defaults now include `storageKey` and keycloak payload defaults to `access_token`
- client connection now exposes raw socket on `$api.get('socket')` for reconnect hooks

- fix18 runtime cleanup: avoid runtime plugin `dependsOn: ['pinia']` for NFZ auth bootstrap; guard on `nuxtApp.$pinia` instead. Builtin server modules (`cors`, `helmet`, `compression`, `body-parser`, `serve-static`, `healthcheck`, `rate-limit`, `secure-defaults`) must resolve deterministically without `scanExports()` when the id is known. Shared remote auth payload logic is exposed through alias `nuxt-feathers-zod/auth-utils`.


## FIX57 - Feathers Dove style Mongo initialization
- Preferred NFZ architecture: initialize MongoDB from the main embedded runtime sequence, not as a scanned server plugin.
- Order is now: app creation -> auth -> mongodb -> services -> scanned plugins -> server modules -> setup.
- This design is required for robust `embedded+mongodb` and `embedded+mongodb+url` scenarios.

## FIX58b
- The NFZ OSS stable candidate now pins `feathers-mongodb-management-ts` to exact npm version `2.1.0`.
- Root scripts must use local project binaries (`nuxi`, `vitepress`) instead of `bunx` to avoid global resolution drift on Windows/Bun environments.

## FIX59
- The playground now supports an explicit `embedded + mongodb + url` mode.
- Env resolution order for playground Mongo is now: `NFZ_PLAYGROUND_EMBEDDED_MONGODB_URL` first, then legacy `MONGO_URL` fallback.
- Mongo runtime modes exposed to the client are: `disabled`, `memory`, `url`.
## FIX60
- `embedded + mongodb + url` requires awaited Mongo initialization before service registration.
- In NFZ generated runtime, Mongo infrastructure must not rely on `app.configure(mongodb)` when the initializer is async.
- Playground now owns the optional URL->memory fallback policy through `NFZ_PLAYGROUND_EMBEDDED_MONGODB_FALLBACK_TO_MEMORY`.

## FIX61 / Patch 1 — schema inspection + mode switching
- The CLI now begins a manifest-first schema management workflow.
- New command family: `schema <service>`.
- Supported in Patch 1:
  - `--show`
  - `--json`
  - `--export`
  - `--get` as compatibility alias of `--show`
  - `--set-mode none|zod|json`
- CLI now stores service schema state under `services/.nfz/services/<service>.json` and updates `services/.nfz/manifest.json`.


## Patch 2 status
CLI schema management now supports field mutations for existing services:
- add field
- remove field
- set/replace field
- rename field

Current Patch 2 scope:
- manifest-first mutations
- artifact regeneration in current schema mode
- no auth safety guards yet (Patch 3)


## PATCH63 / Patch 3 status
CLI schema management now includes auth guard rails and mutation preview helpers:
- `--diff`
- `--dry`
- `--force`
- special protections for auth-enabled `users`

Current guard rule:
- `users` with `auth=true` cannot switch to `json` or `none` without `--force`
- protected fields `userId` and `password` cannot be removed, renamed, or modified without `--force`

## PATCH64 / Patch 4 status
CLI schema management now includes auth repair and validation helpers:
- `schema <service> --validate`
- `schema <service> --repair-auth`
- `schema <service> --show` now reports auth compatibility and issues

Current Patch 4 rule:
- auth-enabled `users` is considered compatible when:
  - schema mode = `zod`
  - `userId` exists, type `string`, required
  - `password` exists, type `string`, required
- `--repair-auth` restores these invariants automatically

## users --auth generation rule
The CLI has a dedicated auth-aware generation path for `users` when `auth=true`.
This is mandatory for local auth runtime compatibility.
A generic CRUD users schema is insufficient even if `userId` and `password` are present in the manifest.


## 2026-03-13 — OSS stabilization / Nitro parse incident
- La chaîne Nitro/Rollup peut parser certains templates générés avant traitement TypeScript complet.
- Conséquence : éviter toute syntaxe TS résiduelle dans les fichiers runtime `.ts` générés côté serveur.
- Correctif appliqué : `feathers/server/authentication.ts` devient 100 % JS-compatible dans son corps runtime ; l'augmentation de types est déplacée dans `feathers/server/authentication.d.ts`.
- Ajout d'un onglet DevTools minimal `NFZ` via `@nuxt/devtools-kit`, servi sous `'/__nfz-devtools'`.


## PATCH OSS-1D
- Audit complet des templates générés `feathers/server/**` pour éliminer toute syntaxe TypeScript résiduelle dans les fichiers runtime `.ts`.
- Extraction des types vers des fichiers `.d.ts` dédiés pour `server`, `authentication`, `keycloak`, `mongodb`, `validators`.
- `server.ts` généré est désormais runtime-only (helpers JS), avec `server.d.ts` comme surface de types.
- `keycloak.ts`, `mongodb.ts`, `validators.ts` générés sont désormais parseables comme JavaScript par Nitro/Rollup.

- Ajout de `build.config.ts` avec `failOnWarn: false` pour éviter que `nuxt-module-build build` échoue sur des warnings d'implicit bundling non bloquants pendant la stabilisation OSS.


## PATCH OSS-2
- externalisation explicite de `h3` et de sa chaîne transitive dans `build.config.ts` pour réduire les warnings d'implicit bundling pendant `nuxt-module-build build`
- correction de cohérence embedded : `resolveOptions()` transmet désormais le vrai framework REST (`express`/`koa`) à `resolveServerOptions()`
- onglet DevTools NFZ enrichi : mode, transports, auth, keycloak, swagger, servicesDirs et résumé runtime public

## OSS-3 status

- DevTools NFZ now exposes diagnostics, detected services, declared remote services, and known-good scenarios.
- Validation matrix documented in `AI_CONTEXT/OSS_VALIDATION_MATRIX.md`.
- Added option-resolution tests covering embedded express/koa and remote declared services.

- PATCH OSS-3D: corrected `src/runtime/options/transports/rest.test.ts` to replace file-level `vi.mock('./utils')` with a scoped `vi.spyOn(utils, 'checkPath')`, preventing cross-test pollution of `checkPath()` in `utils.test.ts`.


## PATCH OSS-4
- Intégration d'un sous-ensemble vendored de `devtools-ui-kit` dans `src/runtime/devtools-ui-kit` (styles + composants de base de référence) pour servir de socle d'enrichissement de l'onglet NFZ.
- L'onglet DevTools `NFZ` conserve une architecture iframe simple, mais consomme désormais une feuille de styles vendored (`/__nfz-devtools.css`) et expose aussi une route JSON (`/__nfz-devtools.json`).
- Le cockpit NFZ affiche maintenant des onglets `Overview / Services / Runtime / Help`, un filtre local, un basculeur clair/sombre, les services locaux détectés, les services distants déclarés, les stratégies d'auth résolues et les endpoints principaux.
- Cette étape prépare une future migration vers une interface DevTools plus “client-side”, sans remettre en cause la base OSS désormais verte (`module:build`, `nuxi build`, `bun test`).


## PATCH OSS-5
- Remote mode now prefers REST when client.remote.transport='auto' to improve compatibility behind proxies/load balancers that do not permit Socket.IO websocket upgrade.
- Embedded server load order now supports modules:pre -> plugins -> services -> modules:post, with server modules defaulting to phase='pre'.
- CLI middleware generator now supports additional targets: client-module, hook, policy.


## PATCH OSS-5A
- client remote connection: lazy Socket.IO creation in generated connection.ts; no socket is instantiated in auto+remote unless socketio is explicitly selected.
- socket.io client now uses autoConnect:false and connects only when chosen.
- playground remote restPath default aligned to '/'.
- DevTools custom tab renamed to 'nfz-oss' and removed explicit modules category to avoid custom tab router warnings.

- PATCH OSS-5C: règle consolidée — lorsque le client résolu est en mode `remote`, `server.enabled` doit retomber à `false` par défaut sauf override explicite.


## PATCH OSS-5D
- Playground remote REST diagnostics now use a raw fetch first for clearer CORS/network errors.
- Validation/tests pages now separate client mode from auth provider to avoid showing 'local' for remote scenarios.
- Playground remote service declarations default to `users` with `methods: ['find']` for the api.dev-martinique.fr smoke test.
- Public remote runtime config omits empty service methods instead of exposing an empty string.


## PATCH OSS-6A
- Remote transport generation is now mono-transport at runtime.
- Remote mode defaults to socketio when transport is auto/omitted.
- In remote+rest, no Socket.IO client is created or attached to settings.
- In remote+socketio, the client follows the official Feathers socket.io pattern more closely.
- Remote client plugin is registered as client-only from src/module.ts.

## PATCH OSS-6B
- Remote plugin aligned further with Nuxt + Feathers-Pinia usage: $api now exposes the Pinia-wrapped client when enabled, while $feathersClient preserves the raw connected Feathers client.
- Client connection stores resolved transport metadata on the Feathers client (rest/socketio) for easier diagnostics.
- Playground reworked with dedicated pages for remote/socketio, remote/rest, embedded, and middleware validation.
- Index and validation pages now link directly to the dedicated validation surfaces.


- OSS-6C: clarified transport ownership. `feathers.transports` is now treated as embedded/server-only in docs and playground remote config; `feathers.client.remote.transport` is the source of truth for remote mode. CLI `init remote` no longer injects top-level `feathers.transports` by default.


## PATCH OSS-6D1
- Fixed remote client plugin template regression in `src/runtime/templates/client/plugin.ts`: replaced out-of-scope `clientMode` reference with local `cm` when configuring `createPiniaClient(...)` SSR flag.
- Prevents `ReferenceError: clientMode is not defined` during remote playground app initialization.

## PATCH OSS-6E
- Consolidated the remote transport contract after OSS-6D2.
- Current documented rule: in remote mode, omitted/`auto` resolves to `socketio`.
- Explicit `rest` remains the recommended first-pass diagnostic transport for network/CORS troubleshooting.
- Local remote examples now prefer `http://localhost:3030`.

## OSS-6E1 note
- Embedded memory SSR requires server-side origin fallback via `useRequestURL().origin` in the generated client plugin.
- Otherwise startup can fail with `connection(): base url is required`.

- OSS-6E2: fixed playground/tests.vue so embedded mode no longer tries to construct a remote REST URL when remote.url is empty; buildRemoteRestUrl now guards empty/invalid base. Also reduced hydration mismatch noise on playground/app/pages/remote/socketio.vue by deferring socket diagnostics until client mount and rendering the state block through ClientOnly.

## 2026-03-15 — Patch OSS-6E3 playground Mongo management enabled
- Enabled playground embedded Mongo management by default when embedded Mongo is active.
- The OSS playground now mounts Mongo management endpoints under `/feathers/mongo` (auth disabled for DX).
- This fixes the expectation gap where `embedded-mongodb-url` looked Mongo-enabled but `/feathers/mongo (legacy alias: /feathers/mongo/databases)` was not actually mounted.
- Added public runtime diagnostics for `embeddedMongoManagementEnabled` and `embeddedMongoManagementBasePath`.


## OSS-6E6
- Fixed embedded REST bridge fallback for `/feathers/**`: if Express/Feathers does not end the response, the bridge now returns a JSON 404 itself instead of letting Nitro/Nuxt take over and boot the app.
- Corrected Mongo management legacy alias direction: canonical databases endpoint is `/mongo/databases`; legacy `/mongo` now rewrites to `/mongo/databases`.

## OSS-6F test patch
- embedded Mongo management runtime now mounts management routes explicitly from generated `feathers/server/mongodb.ts` via `await mongodb(app)` in infrastructure bootstrap.
- keeps NFZ contract `app.get('mongodbClient')` as `Promise<Db>` while also exposing `mongodbConnection` and `mongodbDb`.
- intended test targets: `/feathers/mongo/databases`, `/feathers/mongo/:db/collections`, `/feathers/mongo/:db/stats`, `/feathers/mongo/:db/:collection/{indexes,count,schema,documents,aggregate}`.



## 2026-03-15 — Patch OSS-6G Mongo management CLI + playground
- Added CLI command `bunx nuxt-feathers-zod mongo management` to patch `feathers.database.mongo.management` in `nuxt.config.*`.
- Added dedicated playground page `/mongo` for embedded Mongo management endpoint checks.
- Documentation aligned with the embedded Mongo management contract validated in OSS-6F.

## 2026-03-15 — OSS-6H
- Mongo management hardened with shared basePath normalization and shared route derivation helpers.
- CLI integration tests now cover `mongo management` patching and dry-run safety.
- Canonical databases endpoint stays `/mongo/databases`; `/mongo` is legacy alias only.


## OSS-6H1
- Fixed test/cli.spec.ts string literal syntax for mongo management CLI tests on Bun/Windows.
- OSS-6H2: corrected `mongo management` CLI boolean coercion for citty boolean flags so explicit forms like `--auth false` and `--exposeUsersService true` are honored by reading rawArgs before patching nuxt.config.

- OSS-6J: CLI enrichi avec `templates list|init`, `plugins list|add`, `modules list|add`, `middlewares list|add`. `doctor` Mongo management est désormais fiable et couvert par tests.

- OSS-6J2: corrected CLI tests to match the current server helper names defineFeathersServerPlugin and defineFeathersServerModule; no runtime change.

## OSS-6K1 docs build fix
- Corrected Bun/VitePress documentation scripts for release 6.3.5.
- Root scripts now use `bunx vitepress ...` inside `docs/`.
- `docs/package.json` now provides `dev`, `build`, `preview` aliases plus compatibility `docs:*` scripts.
- Goal: make `bun run docs:build` reliable on Bun/Windows.


- OSS-6K2: NFZ DevTools theme alignment fixed. The iframe tab now mirrors the parent DevTools dark/light theme and observes parent theme changes live.


- fix(exports): published package exports now point to dist/ for server, client, auth-utils, config-utils, options, zod helpers, and builtin Express/Koa server modules; builtin server module resolution now prefers dist/ with source fallback for local repo development.


- 2026-03-17: Prepared release 6.4.0 with a hardened remote CLI patcher. Chained commands (`init remote`, `remote auth keycloak`, `add remote-service`) now rebuild a valid `feathers` block instead of corrupting nested objects in `nuxt.config.ts`.


- 6.4.1: Added automatic Keycloak `js-sha256` default-export shim alias for consumer Nuxt 4 apps to avoid browser crash from `keycloak-js` importing `js-sha256` as a default export.

- v6.4.7 focus: consumer-safe CLI patch idempotence for existing `feathers` blocks in Nuxt 4 apps.

## PATCH 6.4.8
- objectif: idempotence complète du module pendant bun install / nuxt prepare
- déduplication des alias Vite, optimizeDeps.include, tsConfig.include et modules @pinia/nuxt
- cible: empêcher les empilements côté module après une configuration CLI déjà propre
