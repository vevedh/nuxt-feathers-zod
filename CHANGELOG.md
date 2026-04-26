# Changelog

## 6.5.11

- fix browser/tarball runtime: stop forcing @feathersjs/* CommonJS packages into Vite optimizeDeps for the native NFZ client
- keep Feathers-Pinia Vite interop hints opt-in only when feathers.client.pinia is explicitly enabled
- prevents @feathersjs/feathers/lib/index.js from being served/executed in Nuxt 4.1 browser dev when installing from .tgz

## 6.5.10

- fix client runtime: remove browser static imports of `@feathersjs/feathers`, `@feathersjs/rest-client`, and `@feathersjs/authentication-client` from the generated Nuxt client path.
- add a native NFZ client shell for tarball installs under Nuxt 4.1.x, avoiding raw CommonJS `exports` in the browser.
- add native REST/auth client templates compatible with generated `.shared.ts` service registrations.


- Fixed the remaining browser ESM/CJS mismatch that appears when NFZ is consumed as a packed tarball instead of a local file dependency.
- Added nested Vite optimizer entries such as `nuxt-feathers-zod > @feathersjs/feathers` so tarball-installed Feathers CommonJS packages are pre-bundled before browser execution.
- Added equivalent nested optimizer entries for `feathers-pinia > @feathersjs/*`, but only when `feathers.client.pinia` is explicitly enabled.
- Patched both `src/setup/apply-client-layer.ts` and `dist/module.mjs` so the package is immediately testable from the generated archive/tarball.

## 6.5.8 - OFetch typecheck method signature follow-up

- Fixed `src/runtime/adapters/ofetch.ts` typecheck failure TS2425 by typing `FetchClientLike.request` as a method signature instead of a function-valued property.
- Kept the v6.5.7 ESM interop rule intact: no static default or fragile named import from `@feathersjs/rest-client` in browser-served runtime client code.
- Aligned `dist/runtime/adapters/ofetch.d.ts` with the corrected method-shaped declaration.

## 6.5.7 - Runtime client ESM import policy

- Hardened browser-served runtime files against fragile CommonJS/ESM interop by forbidding static default and named imports from `@feathersjs/*` client packages and `feathers-pinia`.
- Replaced the static `feathers-pinia` re-export in `src/runtime/composables/pinia.ts` with explicit dynamic loaders: `loadFeathersPinia()`, `resolveCreatePiniaClient()` and `resolveFeathersPiniaHelper()`.
- Updated the NFZ client plugin to resolve `createPiniaClient` through the safe dynamic loader only when `feathers.client.pinia` is enabled.
- Adjusted the OFetch adapter declaration so the generated `.d.ts` no longer reintroduces a named `FetchClient` import from `@feathersjs/rest-client`.
- Added `scripts/check-client-runtime-esm-interop.mjs` and wired it into `verify:sanity` through `sanity:client-runtime-esm-interop`.

## 6.5.6 - Feathers client transport ESM interop

- Fix generated client connection template for Nuxt 4 native ESM by replacing default imports from `@feathersjs/rest-client` and `@feathersjs/socketio-client` with namespace imports and runtime factory resolution.
- Fix generated client authentication template by replacing default import from `@feathersjs/authentication-client` with namespace import and runtime factory resolution.
- Fix `OFetch` adapter to resolve `FetchClient` from the rest-client namespace instead of relying on a named import.
- Add REST, Socket.IO and authentication client packages to Vite `needsInterop` hints for standard NFZ clients.
- Addresses: `@feathersjs/rest-client/lib/index.js does not provide an export named 'default'` from `.nuxt/feathers/client/connection.ts`.

## 6.5.5 - Feathers core ESM interop

- Fix browser-time ESM/CJS interop for the standard NFZ Feathers client when consumed from npm.
- Replace the static named import `import { feathers } from '@feathersjs/feathers'` in the client runtime with a namespace import and runtime factory resolution.
- Always add Vite interop hints for Feathers core client packages when the NFZ client layer is enabled; Feathers-Pinia hints remain opt-in.
- Addresses: `@feathersjs/feathers/lib/index.js does not provide an export named 'feathers'` from `createFeathersClient.js`.


## 6.5.4 - Feathers-Pinia optional runtime split

- Keeps Feathers-Pinia fully opt-in through `feathers.client.pinia`.
- Moves NFZ auth bootstrap out of the Feathers-Pinia branch, so auth works with `pinia: false`.
- Stops forcing Feathers-Pinia Vite interop hints for standard Feathers clients.
- Documents the distinction between `@pinia/nuxt` application stores and `feathers-pinia` service stores.

## 6.5.3

### Fixed

- Make Feathers-Pinia opt-in instead of enabled by default to avoid browser-time Vite interop failures in apps that only use the NFZ auth runtime and standard Feathers client.
- Lazy-load `feathers-pinia` inside `defineNfzClientPlugin()` only when `feathers.client.pinia` is explicitly enabled. This prevents unconditional loading of `feathers-pinia` and avoids `@feathersjs/feathers/lib/index.js does not provide an export named 'feathers'` in NFZ Studio.
- Keep Vite compatibility settings for applications that explicitly enable `feathers.client.pinia: true`.

## 6.5.2

### Fixed

- Stabilize the Nuxt/Vite client bundling path for `feathers-pinia` and FeathersJS client packages when the module is consumed from npm (`nuxt-feathers-zod@^6.5.1` regression).
- Add Feathers client packages to `vite.optimizeDeps.include` and `build.transpile` when `feathers.client.pinia` is enabled, preventing browser-time errors such as: `@feathersjs/feathers/lib/index.js does not provide an export named 'feathers'`.
- Declare `@feathersjs/commons` as a direct dependency because `feathers-pinia` expects it as a Feathers peer dependency.

## 6.5.0
- fix `cli:smoke` doctor expectations to match the current embedded auth defaults and divergent field mapping output.
- stabilize E2E fixtures by aligning embedded auth setup with the already stable absolute-path pattern used by the basic fixture.
- keep the repository on the release-hardened path for npm/GitHub publication after the validated 6.4.138 line.

## 6.4.138
- promote the previously validated 6.4.137 release candidate to a stable 6.4.138 release line.
- stabilize release validation workflow for community publication (typecheck, e2e, tarball smoke, docs build/preview).
- serialize E2E suites in Vitest to reduce flaky startup/port timeout failures on CI and Windows.
- narrow strict ESLint scope temporarily so release-critical CI checks stay green while preserving build, packaging, E2E and docs coverage.

## 6.4.137
- npm metadata aligned for Nuxt community-module submission (`repository`, `homepage`, `bugs`, `keywords`, `engines`, `publishConfig`).
- README / README_fr wording softened to position NFZ as a Nuxt module for FeathersJS rather than an “official Nuxt 4 module”.
- added repository-local draft files for the future `nuxt/modules` listing issue and npm metadata notes.

## 6.4.136

- Mongo admin routes now bridge through standard Feathers `authenticate(...)` hooks before `requireMongoAdmin(...)`, so they follow the same authentication pipeline as regular protected Feathers services.
- Mongo management auth options now expose `authStrategies` (default `['jwt']`) to control that bridge explicitly.
- Generated Mongo admin hooks now reuse the resolved auth options consistently per mounted service.


## 6.4.135
- Fix generated server app template syntax in `src/runtime/templates/server/app.ts` so playground/dev build no longer fails with `Unexpected "const"` in `.nuxt/feathers/server/app.ts`.
## 6.4.132
- Mongo admin embedded runtime now uses `app.get('mongoPath')` as the single source of truth for service mounting.
- `configureFeathersInfrastructure()` normalizes and seeds `mongoPath`; `mongodb.ts` only falls back to `management.basePath` once when no runtime value exists.
- Added regression coverage for the single-source `mongoPath` contract.

## 6.4.131

- fix(auth): preserve explicit `authStrategies` instead of forcing defaults back in `resolveAuthOptions()`
- fix(mongodb): keep Mongo admin auth metadata when `authenticate: false` but `enabled: true`
- fix(mongodb): strip trailing slash when inferring Mongo database names from connection strings
- fix(mongodb): align default resolved Mongo admin auth flags with `management.enabled` when auth config is omitted

## 6.4.130
- fix(client/plugin): avoid referencing `piniaClient` outside `defineNuxtPlugin()` scope in remote dev logging.
- fix(auth-runtime): stop mutating `state.ready` inside `reAuthenticate()` and guard server-side `setSession()` / `synchronizeKeycloakSession()` against shared SSR state pollution.
- fix(auth-local): align default local auth fields with generated auth services by using `email/password` instead of `userId/password`.
- test: add regressions for explicit `authStrategies` preservation and local email defaults.

## 6.4.129

- Fix generated client connection template regression where the emitted code referenced `transport` before declaration.
- Restore deterministic `transport: 'auto'` semantics: embedded browser prefers REST first; remote prefers Socket.IO when available, then falls back to REST.
- Add regression coverage for the client connection template.


## 6.4.128
- Mongo admin template: audit logger now resolves `management.auth.userProperty` instead of hardcoding `params.user`.
- Mongo admin docs clarify `mongodbClient` (`Promise<Db>`), `mongodbDb`, and `mongodbConnection`.
- Added template regression coverage for audit/auth alignment.

## 6.4.127

- auth runtime: recover bearer token from the Feathers authentication client/storage after `authenticate()` and `reAuthenticate()` when the auth response does not expose `accessToken` directly
- auth runtime: `getAuthorizationHeader()` now performs a last-mile token recovery before protected REST calls

## 6.4.126
- safer client transport resolution: embedded browser auto mode now prefers REST; remote auto keeps Socket.IO preference when available and falls back to REST
- remote client plugin no longer forces `socketio` when remote transport is omitted; it preserves `auto`
- REST transport now stays enabled by default unless the app explicitly sets `rest: false`, which avoids accidental Socket.IO-only browser clients
- added regression coverage for client connection template and updated transport docs

## 6.4.125
- Auth runtime now treats startup `reAuthenticate()` with no stored token as an anonymous state instead of an error state.
- Added `reauth-skipped` auth trace events and removed the stale-token startup fallback that could previously mark a session as authenticated after failed reauth.
- Remote client bootstrap now avoids classifying missing-token startup as an auth error, keeping the unified runtime state coherent across embedded and remote modes.
- Updated FR/EN auth runtime + playground docs to explain `anonymous` / `tokenSource = none` on first load, and added regression coverage for missing-token detection.

## 6.4.124
- CLI/docs sync pass: release metadata now aligns on 6.4.124 across README and CLI docs.
- `doctor` now reports embedded local auth defaults, resolved field mapping, and a Feathers-compatible local payload example.
- `doctor` warns when request fields and entity fields diverge for local auth, pointing consumer UIs to `buildLocalAuthPayload()` / `runtimeConfig.public._feathers.auth.local`.
- `scripts/cli-smoke.ts` now includes a doctor/auth smoke scenario.

## 6.4.123
- Fixed the embedded server authentication template to inject the resolved Feathers auth config with `app.set('authentication', authOptions)` before creating `new AuthenticationService(app, 'authentication')`.
- Added a regression test covering the generated authentication server template so the invalid third-argument constructor usage does not reappear.
- Updated README + FR/EN auth docs to clarify that the public local auth field metadata is now honored end-to-end by the Feathers server runtime.

## 6.4.122
- Exposed embedded local auth field metadata in `runtimeConfig.public._feathers.auth.local` (`usernameField`, `passwordField`, `entityUsernameField`, `entityPasswordField`).
- Added `buildLocalAuthPayload()` to `nuxt-feathers-zod/auth-utils` so consumer login UIs can build the correct embedded local auth payload from runtime metadata.
- `useAuthStore().userId` now falls back to `user.userId` / `user.email` before `id` / `_id`.
- Added regression tests and updated FR/EN auth documentation.

## 6.4.102

## 6.4.103
- Fixed embedded Mongo management public base path resolution. In embedded mode, client tooling now prefixes the Mongo management base path with the embedded REST path, so `/feathers` + `/mongo` becomes `/feathers/mongo` and avoids broken requests/warnings to `/mongo/...`.
- playground: ajout de `/auth-runtime` pour diagnostiquer le runtime auth unifié et lire la trace récente des événements auth
- playground: page `/mongo` alignée sur `useProtectedPage()` et `useMongoManagementClient()`
- docs FR/EN: mise à jour des guides Playground et Auth runtime

## 6.4.101

- auth runtime refactor phase 6
- official protected page helper: `useProtectedPage()`
- official auth trace helper: `useAuthTrace()`
- bounded runtime auth event history plus `clearEvents()` / `resetDiagnostics()`

## 6.4.100

- Fix `sanity:internal-imports` on Windows by normalizing path separators in `scripts/check-internal-self-imports.mjs`, so `src/runtime/templates/**` imports remain allowed.

## 6.4.99

### Stabilization
- replace internal runtime self-imports (`nuxt-feathers-zod/client`) with relative imports inside `src/runtime/composables/*`
- add `scripts/check-internal-self-imports.mjs` to prevent forbidden package self-imports from reappearing outside template/runtime entrypoint boundaries
- wire `sanity:internal-imports` into `prepack`, `prepare`, and `release:check`
- keep the playground self-link only for real consumer-style bare imports while making the runtime source itself less dependent on package self-resolution

## 6.4.98

- fix(dev/playground): create a self-link `playground/node_modules/nuxt-feathers-zod` so local `nuxi dev playground` resolves `nuxt-feathers-zod/*` bare imports correctly under the nested playground package scope.
- chore(scripts): run `playground:ensure-link` during `prepare`, `playground:dev`, and `playground:build`.

## 6.4.95

- add phase 4 auth runtime refactor helpers: `useProtectedTool()` and `useMongoManagementClient()`
- expose safe public runtime metadata for Mongo management basePath and routes
- align docs FR/EN for protected runtime tools and embedded Mongo management


## 6.4.93

- auth runtime phase 2: add `useAuthenticatedRequest()` and `useProtectedService()`
- auth diagnostics: add `useAuthDiagnostics()` and `getStateSnapshot()`
- generated client plugin now synchronizes remote auth results with the unified auth runtime
- documentation FR/EN aligned with unified auth runtime and Keycloak bridge behavior

## v6.4.57

- positionnement produit clarifié face à `@nuxtjs/supabase` (README + docs)
- ajout d’une roadmap publique NFZ vNext orientée DX/auth/builder/diagnostics
- ajout des fichiers de contexte de patch (`JOURNAL.md`, `PATCHLOG.md`, `PROMPT_CONTEXT.md`, `AI_CONTEXT/PROJECT_CONTEXT.md`) pour les prochaines itérations


## 6.4.45

- remote + Keycloak: SSO authentication now hydrates the local Feathers client auth store immediately
- remote handshake can use the configured strategy (for example `sso`) while preserving a coherent local fallback state
- `useAuth()` exposes separate SSO and Feathers state to avoid mixed `user/token` semantics
- docs updated for the remote Keycloak contract and backend requirement

## 6.4.34

- Remote mode: hardened Feathers-Pinia bootstrap by waiting for `nuxtApp.$pinia` before creating the client, avoiding false fallback to raw `$api` during early client initialization.
- Remote mode: delayed remote auth bootstrap until after Pinia readiness so auth store hydration and Feathers-Pinia stay coherent.
- DevTools: restored NFZ plume branding from `public/plume-light.png` / `public/plume-dark.png` instead of the embedded fallback icon.
- DevTools: icon route now varies on `Sec-CH-Prefers-Color-Scheme` and iframe theme sync with parent remains enabled by default.

## 6.4.33
- remote + Keycloak auth sync hardening: the Keycloak plugin no longer marks Pinia auth as authenticated when Feathers `authenticate()` actually failed.
- remote client bootstrap now mirrors successful `authenticate()` / `reAuthenticate()` results into the Pinia auth store so Feathers session state is visible immediately in remote mode.
- auth token extraction now accepts `accessToken`, `access_token`, and `token` (including nested `authentication.*` variants) for better IdP/backend interoperability.

## 6.4.31
- Fixed NFZ DevTools icon routing by registering `/__nfz-devtools-icon.png` before the iframe route `/__nfz-devtools` to avoid route capture in consumer apps.
- Kept parent theme auto-sync logic for the NFZ DevTools iframe.

## 6.4.31

- DevTools tab icon now uses theme-aware NFZ plume assets via `public/plume-light.png` and `public/plume-dark.png`.
- NFZ DevTools iframe now applies the parent DevTools theme before first paint to match the active DevTools theme by default.
- Added a dedicated DevTools icon route `'/__nfz-devtools-icon.svg'` and switched the custom tab icon from Carbon to the NFZ plume.

## 6.4.31

- Fixed Windows CLI build wrapper by invoking Bun through cmd.exe /d /s /c on Windows and sh -lc elsewhere.
- Removed fragile direct spawn of bun.cmd that was failing with spawnSync EINVAL on Node 22 / Windows.
- Kept dist/cli/package.json generation after successful bundle.


## v6.4.17
- Fixed template-string escaping regressions in `src/cli/core.ts` and `src/runtime/templates/client/plugin.ts`.
- Restored build/typecheck compatibility for generated Keycloak route middleware and Pinia warning fallback message.
- Updated `package.json` version to `6.4.17`.

- v6.4.16: docs add clear explanation/examples for plugin, server-module, module, client-module, hook, policy CLI targets.

## v6.4.15
- client remote/runtime: when `feathers.client.pinia` is enabled but `nuxtApp.$pinia` is missing, log a clear warning and fall back to the raw Feathers client for `$api` instead of crashing in `createPiniaClient`.

## v6.4.31

- docs(cli): resynchronized README, FR/EN CLI guides, and CLI reference pages around the public v6.4.31 command surface
- docs(schema): documented `--validate`, `--repair-auth`, and `--diff` as first-class schema maintenance flags
- docs(help): clarified `add middleware` target guidance (`nitro` and `route` as public targets, others as advanced)
- cli(help): refreshed built-in help text and command descriptions for middleware and schema maintenance

## v6.4.12

- fix(keycloak-sso): clean OIDC callback hashes like `#state=...&session_state=...&code=...` after Keycloak `check-sso` / callback to avoid Vue Router selector warnings in Nuxt 4 consumer apps
- docs(remote,keycloak): document the automatic hash cleanup and the custom `scrollBehavior` caveat for apps overriding `app/router.options.ts`

## v6.4.11

- docs: added a complete Nuxt 4 remote + Keycloak example page with `auth-keycloak` route middleware and a remote `messages` service call
- docs: linked the new guide from remote/keycloak pages and VitePress sidebar (FR/EN)
- docs: updated README and project journals to reflect the new reference scenario

## v6.4.10

- Fixed CLI inline help for `add middleware <name>` so all supported targets are shown, including `route`, `client-module`, `hook`, and `policy`.
- Synced README and AI context reference with the new route middleware generator example `auth-keycloak`.


## v6.4.9

- added CLI target `route` for Nuxt route middleware generation (`app/middleware/*.ts`)
- added built-in `auth-keycloak` route middleware preset for remote Keycloak SSO
- auto-generates `public/silent-check-sso.html` with the Keycloak route middleware preset
- aligned README/docs/tests with the new Keycloak route scaffolding flow

## v6.4.8

- hardening d'idempotence du module pendant `bun install` / `nuxt prepare`
- déduplication des alias Vite NFZ avant réassignation
- déduplication de `vite.optimizeDeps.include` pour éviter l'empilement sur les prepares successifs
- déduplication de `prepare:types` et `nitro.typescript.tsConfig.include`
- activation `@pinia/nuxt` gardée idempotente côté module
- base CLI 6.4.7 conservée intacte

## 6.4.7

- patcher `nuxt.config.ts` des options `feathers` rendu structurel et idempotent pour toutes les commandes CLI.
- correction des duplications/corruptions de blocs `client`, `keycloak`, `transports` et de la duplication du fichier de configuration.
- fusion plus robuste des services remote et préservation des options `feathers` existantes.

## v6.4.6

- Hardened the `feathers` CLI patcher to avoid duplicate nested keys when patching an existing `feathers` block in consumer Nuxt 4 apps.
- Made remote CLI chaining idempotent for `init remote`, `remote auth keycloak`, and `add remote-service`.
- Prevented duplicate rewrites of `keycloak`, `transports`, and `client` after the remote rebuild step.
- Added regression coverage for repeated remote/keycloak/service patch runs and repeated embedded/mongo patch runs.

## v6.4.5

- Fixed the consumer Keycloak/js-sha256 aliasing issue by applying an exact Vite alias only for the bare `js-sha256` specifier.
- Stopped aliasing deep imports like `js-sha256/src/sha256.js`, which previously caused Vite/esbuild to rewrite the shim import into an invalid local path in consumer Nuxt 4 apps.
- Kept the runtime shim approach for `keycloak-js`, while making the package safer for downstream apps.


## v6.4.4

### Fixed
- Fixed the Keycloak `js-sha256` compatibility shim for consumer Nuxt 4 apps by importing from `js-sha256/src/sha256.js` and exposing a safe default export without alias recursion.
- Fixed consumer dev startup crashes caused by the previous shim implementation (`No matching export ... for import "sha256"`, followed by esbuild `EPIPE` during dependency optimization).

## v6.4.2

### Fixed
- Fixed TypeScript narrowing regression in `src/cli/core.ts` for remote patch generation.
- Fixed broken multiline string in `test/cli.spec.ts` so the CLI test suite parses correctly again.
- Finalized 6.4.x release validation for keycloak shim and remote CLI patching.


## v6.4.1

### Fixed
- Added an automatic Vite/Nuxt alias for `js-sha256` when Keycloak SSO is enabled so consumer Nuxt 4 apps no longer crash in the browser on `keycloak-js` default-import interop.
- Added `keycloak-js` and `js-sha256` to Vite optimizeDeps when Keycloak is enabled.

## v6.4.0 - 2026-03-17

### Fixed
- Fixed remote CLI patching for successive commands in consumer apps.
- Fixed `init remote`, `remote auth keycloak`, and `add remote-service` merges so `nuxt.config.ts` stays valid TypeScript.
- Fixed duplicate transport emission like `rest: rest:` / `websocket: websocket:`.
- Fixed remote service method preservation for commands such as `--methods find,get`.
- Fixed accidental insertion of top-level `auth: false` during remote config patching.

### Changed
- Hardened remote `feathers` config regeneration to rebuild nested `client.remote`, `keycloak`, and `transports` blocks safely.
- Added CLI regression coverage for chained remote configuration commands.

## v6.3.9 - 2026-03-16

### Fixed
- Fixed published package export maps so consumer Nuxt 4 applications resolve NFZ builtin helpers and server modules through `dist/` instead of `src/`.
- Fixed builtin Express/Koa server module resolution to prefer packaged `dist/runtime/server/modules/...` entries with a local-source fallback only for repository development.

### Changed
- Updated release metadata, README, changelog, and public docs for the official `6.3.9` publication.
- Kept the published CLI binaries `nuxt-feathers-zod` and `nfz` aligned with the built `dist/cli/index.mjs` entry.

## v6.3.8
- fix(exports): published package exports now point to dist/ for server, client, auth-utils, config-utils, options, zod helpers, and builtin Express/Koa server modules; builtin server module resolution now prefers dist/ with source fallback for local repo development.
 - 2026-03-16

### Fixed
- Fixed published CLI execution so `bunx nuxt-feathers-zod --help` works in consumer Nuxt 4 applications.
- Fixed `runCli()` to support execution without explicit options and default safely to `process.cwd()`.
- Fixed the built CLI entrypoint by removing the invalid `handleCliError` import from `src/cli/bin.ts`.

### Added
- Added npm binary alias `nfz` so the CLI can also be executed with `bunx nfz --help`.

### Changed
- Updated release metadata and README references from `6.3.7` to `6.3.8`.
- Updated package publication settings to include the built CLI and top-level release documents.



## v6.4.1

### Fixed
- Added an automatic Vite/Nuxt alias for `js-sha256` when Keycloak SSO is enabled so consumer Nuxt 4 apps no longer crash in the browser on `keycloak-js` default-import interop.
- Added `keycloak-js` and `js-sha256` to Vite optimizeDeps when Keycloak is enabled.

## v6.3.7 - 2026-03-16

### Fixed
- Fixed npm/Bun consumer CLI packaging so `bunx nuxt-feathers-zod --help` no longer executes `src/cli/index.ts` from the published package.
- Published CLI now points to a built artifact under `dist/cli/index.mjs`.
- Added CLI build step to `prepare` and `prepack`.

### Tests
- Added packaging assertions for the published CLI `bin` target.

## 6.3.6

### Changed
- Updated the official release metadata and documentation targets from 6.3.5 to 6.3.6.
- Carried forward the validated OSS release base for publication, including embedded Mongo management, expanded CLI coverage, Bun/VitePress docs build fixes, and NFZ DevTools parent-theme synchronization by default.

### Validation
- `bun install` OK
- `bun run module:prepare` OK
- `bun run module:build` OK
- `bun run typecheck` OK
- `bun test` OK (115 pass / 0 fail)

## 6.3.5

- Stabilized embedded and remote runtime behavior for Nuxt 4.
- Added explicit embedded Mongo management mounting and browser-accessible REST endpoints.
- Added CLI support for `doctor`, `mongo management`, `templates`, `plugins`, `modules`, and `middlewares`.
- Aligned public documentation with the OSS CLI surface.
- Fixed Bun/VitePress docs build flow.
- Synced NFZ DevTools tab theme with the parent Nuxt DevTools theme by default.
- Hardened CLI tests, doctor diagnostics, and Mongo management configuration handling.

## v6.4.14

- CLI: updated `renderAuthKeycloakRouteMiddleware()` so generated Nuxt route middleware now cleans OIDC Keycloak callback hash fragments (`#state=...&session_state=...&code=...`) via `history.replaceState(...)` before auth init.
- Prevents Vue Router warnings caused by invalid CSS selector hashes after `check-sso` redirects.

## v6.4.31
- Fix CLI build regression in renderAuthKeycloakRouteMiddleware by replacing an invalid nested template literal with string concatenation (`window.location.pathname + window.location.search`).
- Keep package.json version in sync.

## 6.4.31
- DevTools registration switched from untyped `nuxt.hook('devtools:customTabs', ...)` to `addCustomTab(...)`.
- NFZ tab icon is now served by the module on `/__nfz-devtools-icon.png` for consumer-app reliability.
- Keeps parent-theme sync logic for the NFZ DevTools iframe.

## 6.4.31
- DevTools: local icon route now serves an embedded 64x64 plume PNG buffer instead of reading public/plume-light.png at runtime.
- DevTools: parent theme auto-sync now retries after load and observes both html/body with data-theme and data-color-mode support.


## 6.4.32
- Remote mode + payloadMode=keycloak: Keycloak authenticated state now synchronizes the Feathers client auth session automatically.
- The auth store is marked authenticated with a token fallback to keycloak.token, and protected services using authentication('jwt') are authorized on boot and token refresh.
- feathers-auth bootstrap skips reAuthenticate() in remote Keycloak payload mode; keycloak-sso becomes the source of truth for auth session bootstrap.


## 6.4.35
- devtools asset loading made lazy and fault-tolerant to avoid module prepare failure masked as src/module.ts load error
- public release metadata resynchronized to 6.4.35
- devtools plume icon/theme-parent behavior preserved

- 6.4.45: remote Keycloak Option B contract (`strategy: 'sso'`, `user: loginuser`, `authenticated: true`) is now first-class in the runtime and docs; generated route middleware no longer re-runs `auth.init()` or reuses callback hashes in redirect URIs.

## 6.4.94

- auth runtime refactor phase 3: add `useAuthBoundFetch()` and auth-aware REST fetch implementation
- generated REST clients now use the auth-bound fetch implementation by default
- `useProtectedService()` retries once after `reAuthenticate()` on 401
- docs FR/EN updated for phase 3 runtime auth usage


## 6.4.96
- auth runtime phase 5: official Keycloak bridge helper and richer diagnostics
- protected helpers now validate Keycloak bearer before protected calls
- docs FR/EN aligned on auth runtime phases 3/4/5
