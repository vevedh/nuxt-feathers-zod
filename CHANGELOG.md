
## v6.4.17
- Fixed template-string escaping regressions in `src/cli/core.ts` and `src/runtime/templates/client/plugin.ts`.
- Restored build/typecheck compatibility for generated Keycloak route middleware and Pinia warning fallback message.
- Updated `package.json` version to `6.4.17`.

- v6.4.16: docs add clear explanation/examples for plugin, server-module, module, client-module, hook, policy CLI targets.

## v6.4.15
- client remote/runtime: when `feathers.client.pinia` is enabled but `nuxtApp.$pinia` is missing, log a clear warning and fall back to the raw Feathers client for `$api` instead of crashing in `createPiniaClient`.

## v6.4.13

- docs(cli): resynchronized README, FR/EN CLI guides, and CLI reference pages around the public v6.4.13 command surface
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

# Changelog

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

# Changelog

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

# Changelog


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

## v6.4.18
- Fix CLI build regression in renderAuthKeycloakRouteMiddleware by replacing an invalid nested template literal with string concatenation (`window.location.pathname + window.location.search`).
- Keep package.json version in sync.
