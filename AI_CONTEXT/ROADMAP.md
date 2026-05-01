## v6.4.19

- Release-consistency stabilization: docs/version markers aligned on 6.4.19, CLI build wrapped in Node for Windows/npm predictability, and release metadata sanity check added.

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


- Direct embedded REST browser access is now bridged explicitly for Express + non-root REST path (`/feathers/**`).
- Next follow-up if needed: add equivalent handling for Koa and confirm direct document behavior in production build.

# Roadmap

Future improvements:

- CLI improvements
- DevTools integration
- metrics module
- rate-limit module
- prometheus module
- distributed tracing

## Express server-module presets

Supported preset names: `helmet`, `security-headers`, `request-logger`, `healthcheck`, `rate-limit`, `express-baseline`.

Examples:

```bash
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add server-module express-baseline --preset express-baseline
```

`express-baseline` generates a ready-to-review baseline set in `server/feathers/modules`: `helmet`, `security-headers`, `request-logger`, `healthcheck`, `rate-limit`.


## Granular Express modules via `feathers.server.modules`

You can now declare structured module entries with runtime options:

```ts
feathers: {
  server: {
    modules: [
      { src: 'cors', options: { origin: true, credentials: true } },
      { src: 'helmet', options: { contentSecurityPolicy: false } },
      { src: 'compression', options: { threshold: 1024 } },
      { src: 'body-parser', options: { json: { limit: '1mb' }, urlencoded: { extended: true } } },
      { src: 'serve-static', options: { path: '/', dir: 'public' } },
      { src: 'healthcheck', options: { path: '/healthz', payload: { status: 'ok' } } },
      { src: 'rate-limit', options: { max: 100, windowMs: 60000 } }
    ]
  }
}
```

Supported built-in Express module ids: `cors`, `helmet`, `compression`, `body-parser`, `serve-static`, `healthcheck`, `rate-limit`.

At runtime, each module receives its own options as `ctx.moduleOptions`.

## CLI schema roadmap
- Patch 1: `schema <service>` inspection + mode switching
- Patch 2: field mutations (`--add-field`, `--remove-field`, `--set-field`, `--rename-field`)
- Patch 3: `--force`, `--diff`, `--dry`, and auth-specific safeguards for `users --auth`


## Schema CLI roadmap progress
- Patch 1: inspect schema + set mode ✅
- Patch 2: field mutations ✅
- Patch 3: auth guards + diff/dry ⏳


## Schema CLI roadmap progress
- Patch 1: inspect schema + set mode ✅
- Patch 2: field mutations ✅
- Patch 3: auth guards + diff/dry ✅

## Completed — Patch 4
- auth compatibility validation for schema manifests
- auth repair helper for `users --auth`
- enriched `--show` with auth compatibility reporting

## Completed in FIX65
- auth-aware regeneration for `users --auth`
- local login issue root-caused to generic schema regeneration after forced CLI operations


## Patch OSS-1C
- Corriger entièrement la syntaxe TS résiduelle du template `authentication.ts`.
- Séparer runtime JS-compatible et augmentation de types `.d.ts`.
- Introduire un premier onglet DevTools minimal pour préparer NFZ DevTools.


## PATCH OSS-2
- externalisation explicite de `h3` et de sa chaîne transitive dans `build.config.ts` pour réduire les warnings d'implicit bundling pendant `nuxt-module-build build`
- correction de cohérence embedded : `resolveOptions()` transmet désormais le vrai framework REST (`express`/`koa`) à `resolveServerOptions()`
- onglet DevTools NFZ enrichi : mode, transports, auth, keycloak, swagger, servicesDirs et résumé runtime public

## OSS-3 completed

- Packaging/build stabilized enough for `module:build` and `nuxi build` to pass together.
- Added OSS validation matrix and known-good configuration docs.
- Next phase should focus on higher-level e2e smoke coverage for playground scenarios.

- PATCH OSS-3D: corrected `src/runtime/options/transports/rest.test.ts` to replace file-level `vi.mock('./utils')` with a scoped `vi.spyOn(utils, 'checkPath')`, preventing cross-test pollution of `checkPath()` in `utils.test.ts`.


## PATCH OSS-4
- integrated vendored subset of `devtools-ui-kit` under `src/runtime/devtools-ui-kit`
- enriched NFZ DevTools tab with tabs, search, theme toggle, services/runtime/help views
- added devtools CSS route `/__nfz-devtools.css` and JSON route `/__nfz-devtools.json`
- documented OSS-4 integration in AI_CONTEXT and project journals


## PATCH OSS-5
- Remote mode now prefers REST when client.remote.transport='auto' to improve compatibility behind proxies/load balancers that do not permit Socket.IO websocket upgrade.
- Embedded server load order now supports modules:pre -> plugins -> services -> modules:post, with server modules defaulting to phase='pre'.
- CLI middleware generator now supports additional targets: client-module, hook, policy.


## PATCH OSS-5A
- client remote connection: lazy Socket.IO creation in generated connection.ts; no socket is instantiated in auto+remote unless socketio is explicitly selected.
- socket.io client now uses autoConnect:false and connects only when chosen.
- playground remote restPath default aligned to '/'.
- DevTools custom tab renamed to 'nfz-oss' and removed explicit modules category to avoid custom tab router warnings.


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

## Stabilisation note added in OSS-6E1
- Preserve SSR-safe embedded origin resolution in generated client plugin templates.
- Add broader scenario coverage later for embedded memory SSR smoke validation.

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

## OSS-6H completed
- [x] Mongo management hardening (basePath normalization shared by runtime + CLI)
- [x] Mongo management integration-style tests for CLI patching and dry-run safety
- [x] Route surface helper to reduce drift between docs, CLI, runtime, and playground


## OSS-6H1
- Fixed test/cli.spec.ts string literal syntax for mongo management CLI tests on Bun/Windows.
- OSS-6H2: corrected `mongo management` CLI boolean coercion for citty boolean flags so explicit forms like `--auth false` and `--exposeUsersService true` are honored by reading rawArgs before patching nuxt.config.

- Après OSS-6J, prochaine étape possible: sous-commandes CLI plus fines (`remove`, `doctor`, `inspect`) pour plugins/modules/middlewares et tests d'intégration HTTP Mongo management.

- OSS-6J2: corrected CLI tests to match the current server helper names defineFeathersServerPlugin and defineFeathersServerModule; no runtime change.

## OSS-6K1 docs build fix
- Corrected Bun/VitePress documentation scripts for release 6.3.5.
- Root scripts now use `bunx vitepress ...` inside `docs/`.
- `docs/package.json` now provides `dev`, `build`, `preview` aliases plus compatibility `docs:*` scripts.
- Goal: make `bun run docs:build` reliable on Bun/Windows.


- OSS-6K2 done: align NFZ DevTools iframe theme with parent Nuxt DevTools shell before 6.3.5 publication.


- fix(exports): published package exports now point to dist/ for server, client, auth-utils, config-utils, options, zod helpers, and builtin Express/Koa server modules; builtin server module resolution now prefers dist/ with source fallback for local repo development.


- 2026-03-17: Prepared release 6.4.0 with a hardened remote CLI patcher. Chained commands (`init remote`, `remote auth keycloak`, `add remote-service`) now rebuild a valid `feathers` block instead of corrupting nested objects in `nuxt.config.ts`.


- 6.4.1: Added automatic Keycloak `js-sha256` default-export shim alias for consumer Nuxt 4 apps to avoid browser crash from `keycloak-js` importing `js-sha256` as a default export.
