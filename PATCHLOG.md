- Quality step 3: switched published bin entries to versioned wrappers under `bin/`, added `sanity:package-exports`, and aligned package tests/docs with the new packaging contract.
## 6.4.137
- package metadata readiness pass for Nuxt submission
- README wording cleanup
- issue draft + npm metadata note files added to repo

# Update 6.4.136

- Mongo admin auth now reuses the standard Feathers authenticate hook chain before requireMongoAdmin.
- Added Mongo management authStrategies support (default ['jwt']).
- Mounted services now derive hooks from merged per-service auth options.


## 6.4.135
- Fix generated server app template syntax in `src/runtime/templates/server/app.ts` so playground/dev build no longer fails with `Unexpected "const"` in `.nuxt/feathers/server/app.ts`.
## 6.4.132
- mongodb embedded runtime now treats `app.get('mongoPath')` as the single source of truth for Mongo admin routes
- server app template normalizes/seeds `mongoPath` once from the resolved management base path
- mongodb template only falls back to `management.basePath` when `mongoPath` is missing, then persists the runtime value

## 6.4.131
- authStrategies merge fix
- mongodb auth metadata fix when authenticate=false
- mongodb inferDatabaseName trailing slash fix
- mongodb resolved auth defaults aligned with management.enabled
## 6.4.130
- Follow-up pass after 6.4.121 review, applied on top of 6.4.129.
- Still-open architectural note: the REST transport/auth bootstrap coupling remains something to monitor, but it is not the same class of regression as the plugin/auth-runtime issues fixed here.

## 6.4.129

- Patch: fix generated client connection template regression (`transport is not defined`).
- Patch: make `auto` transport deterministic and aligned with NFZ guidance (embedded => REST-first, remote => Socket.IO-first when available).


## 6.4.128
- Mongo admin template: audit logger now resolves `management.auth.userProperty` instead of hardcoding `params.user`.
- Mongo admin docs clarify `mongodbClient` (`Promise<Db>`), `mongodbDb`, and `mongodbConnection`.
- Added template regression coverage for audit/auth alignment.

- 6.4.127: fixed auth runtime bearer recovery from Feathers auth client storage after authenticate/reAuthenticate; protected tools now receive Authorization reliably.

## 6.4.126
- safer client transport resolution: embedded browser auto mode now prefers REST; remote auto keeps Socket.IO preference when available and falls back to REST
- remote client plugin no longer forces `socketio` when remote transport is omitted; it preserves `auto`
- REST transport now stays enabled by default unless the app explicitly sets `rest: false`, which avoids accidental Socket.IO-only browser clients
- added regression coverage for client connection template and updated transport docs

## Patch 6.4.125 - auth runtime anonymous-start normalization
- Root cause fixed: startup auth bootstrap treated the Feathers client `reAuthenticate()` no-token case as a runtime error even though no stored session existed.
- New contract: when no token is available, `useAuthRuntime()` stays in `anonymous` with `tokenSource = 'none'` and emits `reauth-skipped` instead of polluting the main state with `error`.
- Safety improvement: removed the stale-token startup fallback that could incorrectly restore `authenticated=true` after a failed token-backed reauth.
- Remote startup was aligned too so missing-token boot no longer becomes an auth error in unified runtime state.

## 6.4.124
- Synced the public CLI release metadata to 6.4.124 across README + CLI docs, and restored `AI_CONTEXT/CLI_REFERENCE.md` to the sync surface.
- Added embedded local-auth diagnostics to `doctor`: `auth.enabled`, `auth.authStrategies`, local field mapping, payload example, and divergence warnings.
- Added unit coverage for the new doctor auth diagnostics and extended the CLI smoke scenario with an embedded/local auth doctor probe.

## 6.4.123
- Embedded auth template now uses the documented Feathers configuration flow: `app.set('authentication', authOptions)` before `new AuthenticationService(app, 'authentication')`.
- Added a regression test for the generated auth server template.
- FR/EN docs updated to clarify the end-to-end server/runtime local auth contract.

## 6.4.122
- Auth coherence review: embedded local auth now exposes resolved local field metadata (`usernameField`, `passwordField`, `entityUsernameField`, `entityPasswordField`) in `runtimeConfig.public._feathers.auth.local`.
- Added `buildLocalAuthPayload()` to `nuxt-feathers-zod/auth-utils` so consumer login UIs can build a correct local payload without guessing field names.
- `useAuthStore().userId` now falls back to `user.userId` / `user.email` before `id` / `_id` for better diagnostics/UI coherence.
- Added regression tests for public auth runtime metadata and local auth payload helpers.
- Updated FR/EN docs (README, auth local, auth runtime, authentication reference).

## 6.4.113
- CLI anti-regression pass for add file-service.
- Added generation + syntax tests and hardened template sanity checks.

## 6.4.109
- Added `useNfzAdminClient()` to consume NFZ diagnostics/devtools surfaces through `useAuthBoundFetch()`.
- `resolvePublicRuntimeConfig()` now exposes public admin metadata under `_feathers.admin` for diagnostics/devtools discovery.
- Added `nuxt-feathers-zod/admin-client` package export + alias.
- Added a backlog file in the archive to track phases 6.4.109 → 6.4.114.

## 6.4.108
- Fixed the `add file-service` CLI generator build break. The generated `storageDir` normalization in `src/cli/core.ts` now correctly uses `replace(/\\/g, '/')` instead of an invalid unterminated regex literal.
- This restores `bun run cli:build`, `prepare`, and install flows for the module package.

## 6.4.103 playground mongo cleanup
- Refined `playground/app/pages/mongo.vue` into a real workspace probe: database discovery, collection discovery, stats/schema/indexes/documents snapshot, and explicit workspace refresh.
- Clarified in the UI and docs that Mongo management paths are REST endpoints handled through NFZ helpers, not Vue Router destinations.
- Kept manual per-route probes, but aligned them with the protected NFZ runtime helpers and aggregate POST flow.

## PATCH 6.4.102 - auth-runtime phase 7 / playground diagnostics

## 6.4.103
- Fixed embedded Mongo management public base path resolution. In embedded mode, client tooling now prefixes the Mongo management base path with the embedded REST path, so `/feathers` + `/mongo` becomes `/feathers/mongo` and avoids broken requests/warnings to `/mongo/...`.

- Added playground page `/auth-runtime` to inspect the unified auth runtime, enriched diagnostics, and recent auth events.
- Updated playground `/mongo` to use `useProtectedPage()` and `useMongoManagementClient()` instead of handcrafted fetch logic.
- Updated FR/EN docs to document the official playground auth surfaces.

## PATCH 6.4.101 - auth-runtime phase 6 / protected page + auth trace

- Added `useProtectedPage()` as the official page bootstrap helper for protected screens.
- Added `useAuthTrace()` and a bounded auth runtime event log to inspect recent auth decisions.
- Enriched `useAuthRuntime()` with `events`, `clearEvents()`, and `resetDiagnostics()`.
- Enriched `useAuthDiagnostics()` with `eventCount` and `latestEvent`.
- Added module/package subpaths for `protected-page` and `auth-trace`.

## PATCH 6.4.99 - internal runtime self-import hygiene

- Replaced internal runtime self-imports with relative imports in `src/runtime/composables/feathers.ts` and `src/runtime/composables/useProtectedService.ts`.
- Added `scripts/check-internal-self-imports.mjs` to fail when `src/runtime/**` reintroduces bare `nuxt-feathers-zod/*` imports outside template/runtime entrypoint boundaries.
- Wired `sanity:internal-imports` into `prepack`, `prepare`, and `release:check`.

## PATCH 6.4.98 - playground self-link dev fix

- Added `scripts/ensure-playground-self-link.mjs`.
- The script creates `playground/node_modules/nuxt-feathers-zod` as a symlink/junction to the repository root so bare imports like `nuxt-feathers-zod/server` resolve correctly when running `nuxi dev playground`.
- Hooked the script into `prepare`, `playground:dev`, and `playground:build`.

## PATCH 6.4.95 - auth runtime refactor phase 4 / protected tool clients

- Added `useProtectedTool(basePath)` as the official helper for protected runtime HTTP tools.
- Added `useMongoManagementClient()` as the official Mongo management client helper built on top of the auth runtime.
- Exposed safe Mongo management public runtime metadata (`enabled`, `basePath`, `routes`) for app-side tools.
- Updated FR/EN docs and release notes.


## 2026-04-14 – PATCH 6.4.93 auth runtime refactor (phase 2)

- Added `src/runtime/composables/useAuthenticatedRequest.ts` as the official helper for protected HTTP calls.
- Added `src/runtime/composables/useProtectedService.ts` as the official helper for protected Feathers service calls.
- Added `src/runtime/composables/useAuthDiagnostics.ts` and `getStateSnapshot()` for easier runtime auth diagnostics.
- Updated `src/runtime/templates/client/plugin.ts` so remote `authenticate` / `reAuthenticate` synchronize the unified auth runtime instead of only syncing Pinia state.
- Updated README/README_fr and docs FR/EN to document the unified auth runtime and the recommended protected-call patterns.

## 6.4.87 — Embedded REST body parser fix
- serveur embedded Express : ajout de `json()` et `urlencoded({ extended: true })` avant `app.configure(rest(...))` dans le template source `src/runtime/templates/server/app.ts`
- corrige les requêtes REST JSON embedded qui arrivaient avec `data = undefined` (`POST /feathers/users`, `POST /feathers/authentication`)
- ajoute le log runtime `[NFZ server] body parser pre-rest=true` pour vérifier le chargement effectif
- version module portée à 6.4.87

## 6.4.68
- Docs/README : documentation des modes de vue pédagogiques du Builder Studio.
- Version module alignée en 6.4.68.

## 2026-03-31 — 6.4.63
- Builder Studio : barrels optionnels (`index.ts` service et `services/index.ts`) documentés.
- Starter `users` rapproché des conventions NFZ local auth (`passwordHash`, external resolver).
- Version module alignée en 6.4.63.

## Patch 6.4.61
- version du module alignée en 6.4.61
- docs Builder Studio FR/EN enrichies (starter fields, demo flow Builder → Auth, CLI parity)
- README/README_fr ajustés autour du Builder Studio et de la démonstration produit

# PATCHLOG

## 2026-03-30 — v6.4.57
- docs: ajout de `docs/guide/nfz-vs-supabase.md` et `docs/guide/roadmap-vnext.md`
- docs/en: ajout de `docs/en/guide/nfz-vs-supabase.md` et `docs/en/guide/roadmap-vnext.md`
- docs nav: nouvelles entrées “NFZ vs Supabase” et “Roadmap vNext”
- README: section de positionnement produit vs `@nuxtjs/supabase`
- release metadata: version package `6.4.57`
- contexte patch: ajout de `JOURNAL.md`, `PATCHLOG.md`, `PROMPT_CONTEXT.md`, `AI_CONTEXT/PROJECT_CONTEXT.md`

## PATCH 6.4.58

- version module portée à 6.4.58
- ajout d'une documentation 'Product demos' FR/EN
- README enrichi avec un parcours d'adoption orienté démo produit
- alignement du positionnement NFZ : auth demo, CRUD demo, diagnostics demo, services manager demo



## Patch 6.4.60
- version du module alignée en 6.4.60
- ajout de la documentation Builder Studio FR/EN
- documentation des presets officiels du builder et du routage `/services-manager?preset=...`
- renforcement de la trajectoire produit autour du Builder Studio


## 2026-03-31 — 6.4.62

- builder : starters métier `users`, `articles`, `jobs`, `commands`
- builder : option `hooksFileMode` avec génération séparée du fichier `.hooks.ts`
- builder : apply/preview plus proches du layout CLI NFZ

## 2026-03-31 — 6.4.64
- version module portée à 6.4.64
- documentation Builder Studio mise à jour sur l'agrégation multi-services du root barrel


## 6.4.65
Le parcours **Services Manager** distingue désormais plus clairement les services **Démo builder**, les **Services scannés** et les **Brouillons libres**, afin de rendre les tests simples plus compréhensibles dans l'app de démonstration.

## 6.4.66
- docs(builder): clarifier l’accès rapide aux presets officiels via un onglet dédié
- chore(version): bump package version to 6.4.66


## 6.4.67
- docs(builder): documenter le filtre rapide Tous / Démo / Scannés / Brouillons
- docs(builder): documenter le correctif scroll local `max-h-[56vh] overflow-auto` pour presets/starters
- chore(version): bump package version to 6.4.67

## 6.4.69

- Services Manager ajoute trois cartes d’entrée guidées : tests rapides, services réels et builder avancé.
- Le parcours devient plus lisible avant même d’ouvrir les onglets Workflow / Presets / Workspace.


## 6.4.70 — Docker / Product Edition
- Documentation et version module alignées sur l'édition Docker du dashboard.
- Positionnement clair autour de `NFZ_DATA_DIR`, `NFZ_WORKSPACE_DIR`, `NFZ_BUILDER_APPLY_MODE` et du scaffold licence.

## 6.4.71 — License Center
- documentation du License Center et des composants réutilisables de gestion de licence / feature gating pour les futures options premium de NFZ

## 6.4.72
- chore(release): ajouter `scripts/check-release-files.mjs` pour vérifier les fichiers racine indispensables avant pack/publication
- chore(version): bump package version to 6.4.72


## 6.4.73 — License Center layout clarity
- La page /license-center côté dashboard de démonstration a été refondue pour une lecture plus claire et sans écrasement responsive.
- Nouveau découpage : status + quick actions + runtime summary en haut, puis onglets Overview / Features / Plans.
- Le breakpoint de colonnes latérales a été repoussé à 2xl pour éviter les défauts de mise en page sur desktop intermédiaire.

## 2026-04-14 – PATCH 6.4.92 auth runtime refactor (phase 1)

- Added a unified client auth runtime composable: `src/runtime/composables/useAuthRuntime.ts`.
- Refactored `useAuth()` to delegate to the unified runtime instead of re-deriving state from multiple sources.
- Refactored `useAuthStore()` to use the unified runtime as the single source of truth.
- Refactored `src/runtime/plugins/feathers-auth.ts` to bootstrap auth through `ensureReady()`.
- Refactored `src/runtime/plugins/keycloak-sso.ts` to synchronize Keycloak SSO through the unified runtime.
- Added stronger token propagation to cookies/localStorage/runtime clients.
- Added explicit Keycloak bridge sync using embedded `/_keycloak` by default and remote auth service path when in remote mode.
- Hardened generated server auth normalization for `access_token`, `jwt`, `token`, `bearer`, `user`, and `keycloakUser`.
- Hardened generated Keycloak bridge service to accept token + user hints and return `accessToken` / `authentication`.

Known next step:
- Phase 2 should make protected NFZ runtime tools (Mongo/admin tools) consume only the unified runtime helper or a shared authenticated request helper.

## PATCH 6.4.94 - auth-runtime phase 3

- Added `src/runtime/composables/useAuthBoundFetch.ts` as the official auth-aware HTTP helper.
- Refactored `useAuthenticatedRequest()` to delegate to `useAuthBoundFetch()`.
- Hardened `useProtectedService()` with a one-shot `reAuthenticate()` retry on 401.
- Updated generated REST connection template so REST clients reuse the auth-bound fetch implementation.
- Added module aliases for `auth-runtime` and `auth-bound-fetch`.
- Updated README and VitePress docs FR/EN to document phase 3.

## PATCH 6.4.96 - auth-runtime phase 5

- Added `useKeycloakBridge()` as the official Keycloak SSO -> FeathersJS synchronization helper.
- Enriched `useAuthRuntime()` diagnostics state with bridge path, timing markers, ensure reason, and client sync status.
- Enriched `useAuthDiagnostics()` and `getStateSnapshot()` with the new diagnostic fields.
- `useAuthBoundFetch()` and `useProtectedService()` now explicitly validate the Keycloak bearer before protected calls.
- Updated FR/EN docs for phase 5 and cleaned the duplicated phase 4 sections.


## 6.4.98
- Correction du package export `nuxt-feathers-zod/server` : il ne doit plus pointer vers `dist/runtime/templates/server/server.js` (générateur de template) mais vers un vrai runtime entrypoint exportant `defineFeathersServerPlugin` et `defineFeathersServerModule`.
- Correction symétrique de `nuxt-feathers-zod/client` pour pointer vers un runtime entrypoint stable exportant `defineFeathersClientPlugin`.
- Ajout de `src/runtime/server.ts` et `src/runtime/client.ts` pour stabiliser les imports bare package dans le playground et en mode développement local.


## 6.4.100
- Fixed Windows path normalization in `scripts/check-internal-self-imports.mjs`. The checker now correctly treats `src/runtime/templates/**` as allowed public-boundary imports and no longer blocks `prepack` on valid template imports.

## 2026-04-14 - Auth diagnostics hydration-safe + Mongo playground client-safe
- Added hydration-safe auth diagnostics in `src/runtime/composables/useAuthDiagnostics.ts` to avoid SSR/client text mismatches on auth-sensitive pages.
- Updated `playground/app/pages/mongo.vue` to consume hydration-safe diagnostics and wrap volatile auth/result blocks in `ClientOnly`.
- Goal: remove noisy hydration mismatch warnings while keeping runtime auth/reauth behavior unchanged.

## 2026-04-14 - Protected page hydration-safe rollout
- Extended `useProtectedPage()` with `stableUntilMounted`, `hydrated`, and `displayState` to make protected UI states safer during hydration.
- Extended `useAuthDiagnostics()` with `hydrationState` so consumers can distinguish stable fallback snapshots from live auth state.
- Updated playground `/auth-runtime` and `/mongo` pages to use hydration-safe diagnostics more consistently.
- Updated runtime reference + auth runtime guide in FR/EN to document the new behavior.

## 6.4.104
- useService() privilégie désormais feathers-pinia quand le client Pinia est injecté.
- ajout de useRawService() pour conserver un accès explicite au client Feathers brut.


## 6.4.108
- ajout de la commande CLI `add file-service <name>` pour générer un service local d'upload/download de fichiers
- documentation quickstart clarifiée avec création d'application Nuxt 4 mise en avant
- nouveau guide dédié au starter upload/download

## 6.4.108
- Fix CLI `add file-service`: échappement correct des template literals générés dans `renderFileServiceClass` (`\${id}.bin` / `\${id}.json`).
- Ajout de `bun run clean:repo` pour nettoyer `.nuxt`, `.nitro`, `dist` et le playground sans nécessiter `@nuxt/kit`.


## 6.4.110
- Hotfix Phase 3A: corrected scripts/check-file-service-template.mjs so the sanity check itself parses under Node ESM and no longer blocks prepare/cli:build.


## 6.4.111
- Phase 3B: added `useBuilderClient()` and public builder metadata in `runtimeConfig.public._feathers.builder`.


## 6.4.112
- Phase 3C réalisée : ajout de la page playground `/builder` basée sur `useProtectedPage()` + `useBuilderClient()`.
- Documentation FR/EN ajoutée pour la validation Builder côté playground.


## 6.4.113
- Added CLI anti-regression coverage for `add file-service` and strengthened `check-file-service-template.mjs`.

## 6.4.114
- Hardened the local `file-service` starter with configurable max-size and MIME guards.
- Clarified FR/EN quickstart and repository development flow (`clean:repo` before install in the module repo).
- Fixed visible French drift in selected `docs/en` pages.
- Started pinning critical runtime / CLI dependencies away from `latest`.

## 6.4.115
- repo/doc cleanup pass
- removed stale root artifacts from archive
- added `REPO_DEV.md`
- cleaned FR remnants in English docs
- added `repo:doctor` script

## 6.4.116 — release/build hardening
- Added `sanity:cli-dist-meta` to verify final CLI metadata in `dist/cli/package.json`.
- Hardened `scripts/build-cli.mjs` so the generated CLI package metadata includes `type`, `private`, and both bin names.
- Documented the supported module-repo flow (`clean:repo` -> `install` -> `repo:doctor`) and the expected `module:build` warning around `dist/cli/index.mjs`.


- 6.4.117: fixed invalid YAML front matter in `docs/en/guide/auth-keycloak.md`; added GitHub Pages/VitePress deployment note (`docs/guide/github-pages.md`).


## 6.4.119
- Added docs front matter lint (`bun run docs:check-frontmatter`).
- Wired docs workflow to fail early on invalid YAML front matter before VitePress build.
- Extended GitHub Pages docs with front matter validation guidance.

## 6.4.119
- Fix build/release flow: `prepare` no longer runs `sanity:release-files`, preventing `bun install` failures in CI/packaged contexts where release metadata files are intentionally absent. The release file check remains enforced via `repo:doctor` and `release:check`.

## 6.4.120
- Removed `docs/guide/nfz-vs-supabase.md` and `docs/guide/roadmap-vnext.md`
- Removed `docs/en/guide/nfz-vs-supabase.md` and `docs/en/guide/roadmap-vnext.md`
- Cleaned docs indexes and VitePress navigation links

## 6.4.121

- Documentation clarifiée : chaque exemple utilisant `--adapter mongodb` rappelle maintenant qu'une base MongoDB active est nécessaire, et qu'on peut générer rapidement un `docker-compose.yaml` avec `bunx nuxt-feathers-zod add mongodb-compose`.

- Step 4 (E2E + tarball smoke): added @nuxt/test-utils Vitest config, embedded-basic and embedded-auth fixtures, and scripts/smoke-tarball-install.mjs for packed-install smoke validation.
