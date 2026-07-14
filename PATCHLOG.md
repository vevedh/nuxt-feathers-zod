## 2026-07-14 — v6.5.47 Nettoyage des artefacts de maintenance encore suivis par Git

- le garde public reste strict lorsque des fichiers de maintenance sont réellement suivis dans l’index Git ;
- ajout de `bun run repo:clean-maintenance-index` pour exécuter un `git rm --cached` ciblé sans supprimer les fichiers locaux ;
- le diagnostic `doctor` signale les artefacts de maintenance encore suivis et indique la commande de correction ;
- ajout d’un test de migration Git reproduisant le cas des anciennes `RELEASE_NOTES_*.md` ;
- conservation des 211 tests fonctionnels et des builds playground/VitePress validés sur Windows en 6.5.46.

## 2026-07-14 — v6.5.46 Hygiène des espaces extraits et ordre des hooks de test

- le garde du dépôt public respecte les motifs de maintenance explicitement ignorés lorsqu'une archive source est utilisée sans métadonnées Git ;
- les fichiers de maintenance forcés dans l'index Git restent refusés ;
- le test de sécurité du starter place `afterEach` avant `afterAll`, conformément aux règles ESLint Vitest ;
- aucune modification du runtime Feathers, du playground ou de la politique de seed 6.5.43.

## 2026-07-14 — v6.5.45 Isolation des tests du starter et cohérence des métadonnées publiques

- Le test de sécurité du seed charge désormais le fichier TypeScript réel dans un module temporaire transpilé, sans dépendre du `.nuxt/tsconfig.json` du starter.
- Le test de version du CLI contrôle uniquement les fichiers publics versionnés ; les notes de maintenance locales restent hors Git.
- Les anciennes `RELEASE_NOTES_*.md` sont déplacées dans l'espace local, le motif est ignoré par Git et refusé par le garde du dépôt public.
- `verify:test` et les guides de maintenance utilisent `bun run test`, conformément aux suites Vitest du projet.
- Les protections du seed 6.5.43, les chemins Windows natifs et le build playground 6.5.44 sont conservés.

## 2026-07-14 — v6.5.44 Durcissement des validations Windows et du build playground

- conservation des séparateurs natifs pour les chemins absolus de `servicesDirs` sous Windows ;
- suppression de la normalisation involontaire en `/` dans `resolveSchemaFile()` ;
- génération explicite de `.nuxt/tsconfig.json` avec `writeTypes()` avant le build Vite du playground ;
- ajout d'un garde-fou Windows imposant `writeTypes()` avant `buildNuxt()` ;
- correction des cinq erreurs ESLint détectées par la validation 6.5.43 ;
- conservation sans modification des règles de sécurité du seed et de `cleanUrls: false`.

## 2026-07-14 — v6.5.40 Cohérence documentation, CLI et playground

- correction des Consoles Builder et RBAC afin d'utiliser exclusivement les services Feathers `nfz/*` ;
- normalisation du résultat réel de `nfz/services.find()` sous la forme `{ name, source }` ;
- ajout de la matrice `NFZ_MODULE_CAPABILITIES` et de la commande CLI `capabilities` ;
- génération de la référence CLI FR/EN à partir de l'arbre Citty réellement exporté ;
- ajout d'un contrôle de cohérence entre options Nuxt, composables, services NFZ, événements, CLI et routes du playground ;
- restructuration de VitePress autour d'un plan technique public clair ;
- publication du guide Playground, qui n'est plus exclu du build de production ;
- ajout d'un contrôle statique des liens internes de la documentation ;
- suppression des anciennes pages de console non montées qui appelaient encore les façades Nitro.

## 2026-07-14 — v6.5.39 Identité VitePress et liens projet

- restauration de la plume verte NFZ dans la barre de navigation et le hero de la documentation ;
- ajout d'un favicon dédié ;
- ajout des icônes GitHub et npm dans la navigation FR/EN ;
- ajout des liens explicites vers le dépôt GitHub et le package npm sur les deux pages d'accueil ;
- ajout du contrôle `docs:check-branding` dans les validations de préparation, publication et release ;
- conservation d'assets légers avec une plume WebP d'environ 30 Ko.

## 2026-07-13 — v6.5.38 Services NFZ Feathers-first

- déplacement de la logique Builder et diagnostic vers les services Feathers `nfz/*` ;
- migration de `useBuilderClient()` vers `client.service(...)` ;
- conservation des routes `/api/nfz/**` comme façades dépréciées sans logique métier ;
- ajout de `console.legacyNitroRoutes` pour désactiver ces façades ;
- couverture des appels directs, REST authentifié, REST public et Socket.IO ;
- validation Zod renforcée contre les clés dangereuses et les graphes d’objets excessifs ;
- déplacement des presets dans le runtime serveur publié ;
- ajout du garde-fou `sanity:feathers-first-console` ;
- isolation de chaque fixture E2E dans son propre processus Vitest ;
- mise à jour du playground, des guides FR/EN, de l’architecture et des options.

## 2026-07-13 — v6.5.37 Builder API and Zod playground correction

- enregistrement des handlers Nitro `/api/nfz/**` par le module lorsque la console est activée ;
- suppression des copies locales incomplètes du playground ;
- correction de `GET /api/nfz/schema?service=<service>` ;
- conservation des routes historiques `/api/nfz/schema/:service` ;
- chargement automatique des services dans la page Validation Zod ;
- prévisualisation basée sur les champs réels du schéma ;
- diagnostics JSON repliés et message d’erreur enrichi avec l’endpoint appelé ;
- tests unitaires, d’intégration et E2E ajoutés.

## 2026-07-12 — v6.5.36 Playground validation center

- Added a responsive shell and grouped navigation for all playground routes.
- Added a central smoke-test dashboard with clear success, warning, failure and non-applicable states.
- Reworked the main validation pages around reusable UI components and progressive disclosure of technical diagnostics.
- Kept all existing service, auth, transport, MongoDB, Builder and RBAC routes compatible.
- Added documentation and integration tests for the new playground workflow.

# PATCHLOG

## 2026-07-12 — v6.5.35 Windows install reliability

- correction du hook `prepare` sous Windows : le CLI utilise directement `Bun.build()` ;
- suppression de la recherche d’un second exécutable Bun depuis un processus Node.js ;
- nettoyage autonome des caches Nuxt, Nitro, `.output` et Vite ;
- ajout de `bun run dev:fresh` ;
- chargement direct du CLI Nuxt local par `scripts/run-playground.mjs`, sans shim Windows ni processus enfant ;
- relèvement du prérequis Bun à `>=1.3.6` ;
- pré-bundling de `socket.io-client` dans le playground ;
- documentation de dépannage FR/EN et tests anti-régression associés.

## 2026-07-11 - Préparation de la publication 6.5.32

- Incrément de la version `6.5.31` vers `6.5.32`.
- Finalisation de l'entrée CHANGELOG de migration vers `@vevedh/feathers-nitro@0.5.0`.
- Ajout d'un contrôle anti-collision npm et d'un contrôle strict entre tag Git et version du package.
- Ajout de `release:pack`, `release:prepare:publish` et `publish:npm:dry-run`.
- Ajout du workflow `.github/workflows/publish-npm.yml` prévu pour npm Trusted Publishing/OIDC.
- Synchronisation des marqueurs de version de la documentation FR/EN.
- Correction du contrôle de métadonnées pour ne plus dépendre d'un fichier local ignoré par Git.
- Ajout des notes de publication et de la procédure de publication FR/EN.

## 2026-07-11 - Migration vers `@vevedh/feathers-nitro`

- Migration proche de l’adaptateur Nitro vers `@vevedh/feathers-nitro@0.5.0`.
- Alignement de `engines.node` sur `^22.12.0 || ^24.11.0 || >=26.0.0`.
- Imports générés `/handlers` et `/routers` conservés à API identique.
- Ajout du garde-fou `sanity:feathers-nitro`, exécuté dans `prepack` et `verify:sanity`.
- Cartographie exhaustive et recommandations multi-instance consignées dans `ANALYSE_MIGRATION_FEATHERS_NITRO.md`.
- Aucun changement implicite des transports, chemins, services, auth, MongoDB ou cycle de vie mono-instance.

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
- Synced the public CLI release metadata to 6.4.124 across the README and CLI documentation.
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
- contexte patch : ajout des journaux techniques et du suivi de version

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

## 6.5.29-real-world-nuxt4-quasar-docs

- Applied the real-world documentation patch directly to the stable 6.5.29 archive.
- Added FR/EN guides for integrating NFZ in a full Nuxt 4 + Quasar + UnoCSS + Pinia business application.
- Added FR/EN migration guides for moving an existing Nuxt 4 app from Pinia/localStorage seeds to NFZ services.
- Added FR/EN real-world integration checklists.
- Added a dedicated guide explaining the role of the Quasar + UnoCSS + Pinia starter as the recommended application path.
- Added reusable snippets under `examples/real-world-nuxt4-quasar-nfz/snippets`.
- Updated VitePress navigation and home pages in both French and English.
- Updated root README files to surface the business application path.

## 6.5.30 - Remote Keycloak LDAP bridge documentation

- Version bump: `6.5.29` -> `6.5.30`.
- Added the French guide `docs/guide/remote-keycloak-ldap.md`.
- Added the English guide `docs/en/guide/remote-keycloak-ldap.md`.
- Documented the recommended remote SSO bridge strategy name: `keycloak-ldap`.
- Documented why the frontend must not send or trust `authenticated: true`.
- Added a complete backend `SsoLdapStrategy` example using Keycloak JWKS verification and LDAP/AD lookup.
- Added `examples/remote-keycloak-ldap/` with Nuxt remote configuration, silent SSO page, backend strategy, auth registration, backend config and `.env.example`.
- Updated VitePress navigation/sidebar in French and English.
- Linked the LDAP bridge guide from the existing Keycloak SSO guides.

## 6.5.30-postfix.1 - Lint examples and docs dev warning

- Fixed ESLint style errors in real-world Nuxt 4 + Quasar snippets.
- Fixed ESLint style errors in the remote Keycloak LDAP example.
- Fixed extra blank line in the starter seed module.
- Replaced `env` markdown fences with `txt` to avoid VitePress Shiki language fallback warnings during docs dev.

## 6.5.30-postfix.2 - Keycloak client-only SSO runtime

- Reworked the Keycloak runtime to be client-only by default.
- Stopped automatic Keycloak -> Feathers remote authentication when `remote.auth.payloadMode = 'keycloak'`.
- Split the auth runtime state into `ssoUser` / `ssoToken` and `feathersUser` / `feathersToken`.
- Added explicit `setSsoSession()`, `setFeathersSession()` and `bridgeSso()` helpers.
- Updated the Keycloak plugin so it only initializes Keycloak, stores the SSO session, refreshes the SSO token and never calls the backend bridge automatically.
- Updated `useKeycloakBridge()` to keep SSO synchronization client-only and expose an explicit `bridgeToFeathers()` helper.
- Updated the FR/EN Keycloak docs and the remote Keycloak LDAP guide to document the explicit bridge pattern.
- Updated the remote Keycloak LDAP example to remove automatic `remote.auth.payloadMode = 'keycloak'` configuration.
## 2026-05-12 — Documentation modèle Nuxt 4 SPA + Keycloak client-only + LDAP backend

- Ajout du guide simple `docs/guide/remote-keycloak-ldap.md` et de sa version anglaise.
- Mise à jour des pages Keycloak pour refléter le modèle validé : Keycloak côté client Nuxt, NFZ remote direct, LDAP côté backend Feathers.
- Remplacement des exemples `auth.bridgeSso()` par l'appel direct `api.service('authentication').create({ strategy: 'keycloak-ldap', ... })`.
- Ajout de l'exemple complet `examples/nuxt4-keycloak-ldap-spa-ref/`.
- Documentation du nettoyage de l'URL `#state=...` après `keycloak.init()`.
- Documentation du CORS backend obligatoire pour `OPTIONS /authentication`.


## 2026-05-12 — Documentation modèle Nuxt 4 SSR + Keycloak client-only + LDAP backend

- Ajout du guide français `docs/guide/remote-keycloak-ldap-ssr.md`.
- Ajout du guide anglais `docs/en/guide/remote-keycloak-ldap-ssr.md`.
- Ajout de l'exemple complet `examples/nuxt4-keycloak-ldap-ssr-ref/`.
- Mise à jour de la navigation VitePress FR/EN.
- Mise à jour des pages d'accueil FR/EN avec le lien vers la variante SSR.
- Mise à jour du README racine pour distinguer le modèle SPA et la variante SSR.
- Conservation du modèle d'architecture : Keycloak côté client, NFZ 6.5.30 remote direct, LDAP/AD côté backend Feathers, sans proxy Nitro local.

## 2026-05-13 — Production documentation audit

- Reworked the root README files for npm/GitHub publication.
- Added `PRODUCTION_AUDIT.md` with module structure, CLI contract, runtime surface and production recommendations.
- Added FR/EN production readiness guides.
- Rewrote FR/EN CLI, runtime, services and configuration references to match the current source tree.
- Added FR/EN events and hooks references for `useAuthRuntime()` diagnostics and Feathers tracing.
- Removed generic placeholder wording from public documentation pages.
- Updated VitePress navigation and sidebars for production and events pages.
- Removed a duplicated CLI help line for `--payloadMode`.
- Removed a duplicated `accessToken` assignment in the auth runtime.

## 2026-05-13 — Restore VitePress landing page hero

- Restored the FR/EN VitePress home page as a real `layout: home` landing page.
- Restored the hero block, action buttons and feather image reference.
- Kept the production documentation links introduced during the audit pass.
- Verified the referenced hero image exists under `docs/public/images/plume-dark.png`.

## 2026-05-13 — 6.5.31 GitHub Actions Node 24 compatibility

- Bumped the package version from `6.5.30` to `6.5.31` for the CI/GitHub Pages compatibility patch.
- Updated `.github/workflows/ci.yml` to run on Node.js 24 and Node 24-compatible official actions:
  - `actions/checkout@v5`
  - `actions/setup-node@v5`
- Updated `.github/workflows/docs.yml` for GitHub Pages deployment:
  - added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`;
  - added `NODE_OPTIONS=--max-old-space-size=4096`;
  - added `NUXT_TELEMETRY_DISABLED=1`;
  - switched to Node.js 24;
  - added `actions/configure-pages@v6`;
  - switched deployment to `actions/deploy-pages@v5`;
  - switched upload to `actions/upload-pages-artifact@v4`;
  - added `.nojekyll` generation before artifact upload.
- Updated release metadata in README and CLI documentation.
- Verified workflow YAML syntax, documentation front matter, TypeScript syntax, release metadata and required release files.

## 2026-05-13 — Docs build guard for VitePress conflict markers

- Added `scripts/check-docs-conflicts.mjs` to detect unresolved Git conflict markers before VitePress runs.
- Updated `docs:build` and `docs:dev` so the marker check runs immediately after frontmatter validation.
- Updated `verify:sanity` to include the documentation conflict marker check.
- Regenerated the documentation archive from a clean `docs/en/guide/migrate-existing-nuxt4-app.md` file to prevent VitePress from interpreting `<<<< HEAD` as a snippet import path.

## 2026-07-12 — Analyse globale et plan du patch 6.5.33

- Inventaire exhaustif de 925 fichiers et génération des métriques de symboles/événements.
- Identification d’une course de démarrage liée au plugin Nitro asynchrone.
- Confirmation de la promesse Socket.IO non attendue.
- Confirmation de la divergence Feathers/Nitro/H3 dans le verrou.
- Identification de secrets MongoDB/Keycloak sérialisables dans les templates générés.
- Mise en évidence de la couverture Vitest partielle : 2 fichiers exécutés sur 25 présents.
- Identification de la CI mutante (`lint:fix`) et de l’absence de tests en CI.
- Proposition du patch 6.5.33 « Runtime readiness, dependency convergence and release hardening ».
- Report du multi-instance public à la version 6.6.0 après stabilisation du socle.
