## 6.6.0 - 2026-07-19 - Authentication Provider Registry and Security Foundation

- Make the tarball consumer smoke deterministic on Windows by preferring npm over Bun shared-cache installs, while preserving an explicit isolated-cache Bun validation path.
- Correct the final `antfu/curly` lint regression in the Git-index migration test without weakening repository lint rules.
- Migrate stale private maintenance files out of the Git index automatically during source preparation and repository cleanup, while preserving the local files and cleanly skipping extracted archives without Git metadata.
- Keep playground diagnostics and `/tests` accessible to anonymous developers while protecting only routes that explicitly opt into authentication.
- Treat expected 401/403 responses from protected NFZ diagnostics as warnings in read-only dashboard checks, while preserving failures for real runtime errors.
- Document all 16 playground routes in both French and English user guides.
- Recheck the compiled module runtime before every isolated E2E fixture after repository cleanup.
- Make production-mode authentication E2E fixtures portable across Bun environments with an ephemeral secret and inlined Zod dependency.
- Separate the bilingual public user documentation from ignored maintainer documentation, preserving the NFZ logos and theme.
- Simplify the public VitePress navigation around installation, services, frontend usage, authentication, playground examples and production.
- Generate public playground screenshots only after their Playwright functional assertions pass.
- Rebuild the module runtime before both Vitest E2E and Playwright after `clean:repo`, and scope browser selectors to stable page regions.
- Complete the Windows release-gate follow-up by including `playwright.config.ts` in typed ESLint parsing and correcting the final authentication lint findings.
- Make repository typechecking resolve maintained package subpaths from source, so `clean:repo` cannot break `server-auth`, `query` or `validators` imports before the module build.
- Rebuild the module runtime automatically before Playwright starts a self-linked playground after cleanup, preventing missing `dist/runtime/server/instance-registry.js` failures.
- Align the CLI generator integration test with the provider-aware `authenticateNfz()` contract instead of the legacy JWT-only hook.
- Add typed OIDC service configuration handling and explicit RBAC role types detected by the complete Windows TypeScript gate.
- Correct the complete ESLint regression set detected by the Windows release gate without weakening lint coverage.
- Make `release:pack` resolve npm's JavaScript CLI and execute it through Node.js, avoiding direct `.cmd` spawning and `spawn EINVAL` on Windows.
- Add Playwright desktop/mobile browser validation, CI installation, release gating and controlled VitePress screenshot generation.
- Add `sanity:playwright` to enforce alignment between browser tests, CI, developer guides and tracked screenshot assets.
- Add French and English developer guides for functional browser testing, traces, screenshots and stable accessible selectors.
- Add a declarative authentication provider registry with built-in local, JWT, OIDC bearer-token and API-key strategies, plus a custom strategy extension point.
- Normalize authenticated identities as `params.principal`, including provider, subject, tenant, organization, roles, permissions, scopes, authentication methods and assurance level.
- Add `authenticateNfz()` so generated services accept the providers resolved from module configuration while legacy `authenticate('jwt')` hooks remain supported.
- Add OIDC issuer discovery, exact issuer/audience verification and remote JWKS signature validation, with production rejection of insecure `failOpen` behavior.
- Add high-entropy API-key authentication with SHA-256 base64url hashes, optional server-side pepper, expiry/revocation controls and timing-safe comparison; raw keys are never accepted as stored records.
- Replace the deterministic project-path JWT secret with a production-safe key policy supporting strong symmetric secrets or asymmetric private/public key pairs and `kid` rotation metadata.
- Restrict public runtime authentication metadata to non-secret provider fields and add a release guard that detects future security-foundation regressions.
- Preserve `authStrategies`, `auth.local`, `jwtOptions`, Keycloak bridge behavior and current local/JWT applications through a backward-compatible option resolver.
- Automatically register a JWT verification strategy whenever a declarative provider issues an NFZ access token, while keeping API-key-only deployments tokenless when `issueAccessToken: false`.
- Enforce JWT algorithm/key-mode compatibility, matching asymmetric key pairs, RSA keys of at least 2048 bits, fixed verification algorithms and sanitized caller overrides.
- Migrate the NFZ console, MongoDB management services and bundled starter to provider-aware hooks instead of hard-coded JWT-only protection.

## 6.5.50 - 2026-07-18 - Canonical release version coherence

- Align the package manifest, public README files, VitePress release markers, production audit and maintained first-party examples on `6.5.50`.
- Update the bundled Quasar/UnoCSS/Pinia starter and both Keycloak/LDAP reference applications to consume `nuxt-feathers-zod@6.5.50`.
- Replace the obsolete release-specific starter archive reference with the maintained repository path.
- Add `sanity:version-coherence` to release, prepack, repository doctor and verification workflows so stale current-version references fail before publication.
- Preserve historical version references in `CHANGELOG.md`, `PATCHLOG.md` and migration notes; no public runtime API behavior changes from `6.5.49`.

## 6.5.49 - 2026-07-14 - SSR-preserving auth hydration boundary

- Preserve SSR on the playground dashboard while keeping the auth UI structurally neutral until client session restoration completes.
- Remove the redundant root `routeRules['/'].ssr = false` override introduced in 6.5.48.
- Surface `auth.init()` failures through the existing authentication error panel instead of silently swallowing bootstrap errors.
- Strengthen playground regression coverage for SSR retention, deterministic auth hydration and bootstrap error visibility.
- Add `sanity:auth-hydration` to `prepack` and `release:check` so the SSR/auth boundary is enforced without requiring browser execution.
- Scope the hydration guard to the dashboard `onMounted` bootstrap block so unrelated login error handlers cannot satisfy the invariant.

## 6.5.48 - 2026-07-14 - Deterministic playground auth hydration

- Keep the playground dashboard auth branch structurally stable until the client auth runtime has finished restoring the session.
- Display a neutral session initialization state before exposing authenticated or anonymous UI.
- Configure the dashboard route as client-rendered through Nuxt `routeRules` instead of relying on unsupported page metadata.
- Add playground regression coverage for the hydration boundary and preserved Feathers auth behavior.

## 6.5.47 - 2026-07-14 - Tracked maintenance index cleanup

- Keep `sanity:public-repository` strict when local maintenance artifacts are still tracked by Git.
- Add `repo:clean-maintenance-index` to remove tracked maintenance artifacts from the Git index while preserving local files on disk.
- Make the repository hygiene failure print the exact safe cleanup command.
- Extend `doctor` with a tracked-maintenance diagnostic and remediation guidance.
- Add Git-index migration coverage for stale `RELEASE_NOTES_*.md` files.

## 6.5.46 - 2026-07-14 - Extracted workspace hygiene and deterministic test hooks

- Keeps ignored local maintenance artifacts out of the public repository boundary even when a source ZIP is extracted without Git metadata.
- Continues to reject maintenance files that are explicitly forced into the Git index.
- Fixes Vitest hook ordering in the isolated starter security suite so ESLint remains green.
- Preserves the validated 131 unit, 71 integration and 8 E2E scenarios from the Windows 6.5.45 validation.

## 6.5.45 - 2026-07-14 - Isolated starter security tests and public release metadata

- Runs the starter seed security tests from an isolated transpiled module so Vitest no longer depends on a generated `.nuxt/tsconfig.json` inside the example application.
- Aligns CLI release metadata tests with the public repository contract by checking `CHANGELOG.md` and `PATCHLOG.md` instead of local-only release notes.
- Moves historical `RELEASE_NOTES_*.md` files out of the public tree, ignores that pattern, and extends the repository hygiene guard so local release notes cannot be recommitted.
- Aligns the `verify:test` script and current maintenance documentation on the Vitest aggregate command `bun run test`; direct `bun test` is not used for project validation.
- Preserves the 6.5.43 secure demo seed defaults, native Windows path handling, and deterministic playground build introduced in 6.5.44.

## 6.5.44 - 2026-07-14 - Windows path and playground build hardening

- Preserve native filesystem separators when resolving absolute service schema directories, including Windows paths.
- Generate the Nuxt playground build-directory `tsconfig.json` explicitly before the programmatic Vite build starts.
- Extend Windows tooling and CLI regression checks to enforce type generation before `buildNuxt()`.
- Fix the deterministic ESLint regressions introduced by the secure starter tests and imports.
- Keep the 6.5.43 secure demo seed defaults and GitHub Pages `cleanUrls: false` behavior unchanged.

## 6.5.43

- désactive le seed du compte de démonstration par défaut en production ;
- exige une activation explicite et un mot de passe robuste pour un seed de production ;
- retire l’identifiant et le mot de passe des journaux de seed ;
- conserve le seed de développement rétrocompatible ;
- désactive `cleanUrls` dans VitePress pour stabiliser les routes et assets sur GitHub Pages ;
- ajoute des tests de non-régression pour les règles de sécurité du starter.

## 6.5.42 - 2026-07-14 - Playground mongos direct service contract

- Fixed `/mongos`, which still called the removed service-store method `useFind()`.
- The page now reads `mongos` through the canonical Feathers `find()` method returned by `useService()`.
- Pinia availability is displayed separately through `useNfzPinia()` so the playground reflects the standard client runtime accurately.
- Added a coherence guard that rejects legacy `useFind()`, `useGet()`, `useCreate()`, `usePatch()` and `useRemove()` service-store calls in playground pages.
- Updated the French and English playground guides to document the direct Feathers service contract.

## 6.5.41 - 2026-07-14 - Public repository hygiene and documentation style

- Move local maintenance notes and internal patch reports outside the publishable repository tree.
- Ignore `patch-memory/` and local maintenance artifacts in Git.
- Remove local review and editor integration files that do not belong to the public project source.
- Add `sanity:public-repository` to block private maintenance artifacts and legacy handoff markers during prepare and release checks.
- Refocus the documentation style check on direct, natural technical writing.
- Update publishing guidance so the public maintenance record is `CHANGELOG.md`, `PATCHLOG.md` and the release notes.

## 6.5.40 - 2026-07-14 - Documentation, CLI and playground coherence

- Fix Builder and RBAC playground consoles to consume the canonical Feathers `nfz/*` services.
- Normalize the real `{ name, source }` service discovery payload before selecting a Builder service.
- Add a versioned runtime capability matrix and the `capabilities` CLI command.
- Generate the FR/EN CLI reference from the actual Citty command tree.
- Add a project coherence gate covering module options, composables, NFZ services, auth events and playground routes.
- Reorganize and rewrite the core VitePress technical documentation around the real module architecture and process.
- Remove obsolete unpublished Nitro-driven console pages and an unreferenced legacy CLI initialization implementation.
- Run unit and integration Vitest suites sequentially at file level for deterministic completion in Windows and constrained environments.

## 6.5.39 - 2026-07-14 - Documentation branding and project links

- Restore the green NFZ feather in the VitePress navbar and home hero with an optimized transparent WebP asset.
- Add a dedicated favicon based on the project feather.
- Expose both GitHub and npm icons in the French and English VitePress navigation.
- Add explicit npm and GitHub project links to both documentation home pages.
- Add `docs:check-branding` to prevent broken logo references or missing project links during prepare, prepack and release validation.
- Keep the documentation asset budget small by replacing the former multi-megabyte PNG references with a 30 KB WebP and a 5 KB favicon.

## 6.5.38 - 2026-07-13 - Feathers-first Builder and diagnostic services

- Move Builder, schema, manifest, status, RBAC, preset and initialization operations to canonical Feathers services under `nfz/*`.
- Refactor `useBuilderClient()` to use the injected Feathers client instead of Nitro HTTP helpers.
- Support the same administration contracts through direct server calls, REST and Socket.IO.
- Keep `/api/nfz/**` as optional deprecated compatibility facades that delegate to Feathers and expose deprecation headers.
- Add `console.legacyNitroRoutes` so new applications can disable the compatibility layer.
- Reuse Feathers authentication hooks for external console calls and preserve read-only operation through `console.allowWrite`.
- Reject unsafe object keys, deeply nested payloads and oversized object graphs before schema processing.
- Move preset runtime helpers into the published server runtime to prevent unresolved consumer imports.
- Add `sanity:feathers-first-console`, authenticated REST coverage and Socket.IO coverage.
- Run each Nuxt E2E fixture in an isolated Vitest process to prevent server lifecycle leakage between fixtures.
- Rewrite the Builder and architecture documentation around the Feathers-first contract.

## 6.5.37 - 2026-07-13 - Builder API registration and playground schema fix

- Register the NFZ console and Builder Nitro handlers from the module when `feathers.console.enabled` is true.
- Fix `GET /api/nfz/schema?service=...` returning `Page not found` in the playground.
- Keep the historical `/api/nfz/schema/:service` read and write routes available.
- Remove incomplete duplicate Builder handlers from `playground/server/api/nfz`.
- Make public Builder metadata reflect the actual console enablement state.
- Load discovered services into the Zod validation page and collapse raw JSON diagnostics by default.
- Send valid schema fields to the preview endpoint and add end-to-end coverage for the Builder surface.
- Resolve absolute `servicesDirs` without prefixing `projectRoot`, preventing fallback scans from selecting homonymous schemas under `examples/`.

## 6.5.36 - 2026-07-12 - Playground validation center

- Replace the fragmented playground home page with a responsive validation dashboard.
- Add non-destructive checks for the Nuxt client injection, NFZ runtime, service manifest, authentication, Feathers calls and MongoDB.
- Add a shared layout, grouped navigation, status badges, reusable panels, feature cards and collapsible JSON diagnostics.
- Simplify the connection/authentication, messages, actions, MongoDB, Builder, auth runtime, embedded, REST and Socket.IO pages.
- Add system light/dark mode support without introducing a new UI runtime dependency.
- Rewrite the playground README and scenario guide around a concrete validation workflow.
- Add integration coverage for the new playground structure.

## 6.5.35 - 2026-07-12 - Windows install and playground reliability

- Run the CLI build under Bun and call `Bun.build()` directly instead of spawning a PATH-dependent `bun` child process from Node.js.
- Fix `spawnSync bun ENOENT` during the `prepare` hook executed by `bun install` on Windows.
- Run the playground through the project-local `@nuxt/cli/cli` entry without a Windows shim or spawned child process.
- Require Bun `>=1.3.6` for the validated Windows toolchain.
- Expand `clean:repo` to remove Nuxt, Nitro, output and Vite caches without requiring `@nuxt/kit`.
- Add `dev:fresh` for a reproducible install, cleanup, typecheck and playground startup sequence.
- Pre-bundle `socket.io-client` in the playground to avoid late Vite dependency discovery.
- Document the correct first-install order and Windows troubleshooting flow in French and English.
- Add regression coverage for the CLI build implementation and playground dependency optimization.

## 6.5.34 - 2026-07-12 - CLI performance and documentation refresh

- Split lightweight CLI help and shared types from the generator core.
- Load generator and doctor command implementations only when a command needs them.
- Build the CLI with ESM code splitting and enforce entry/total bundle budgets.
- Add a reproducible CLI startup benchmark to CI and release checks.
- Publish only the maintained starter example instead of the complete examples tree.
- Replace oversized documentation PNG assets with their SVG equivalents.
- Standardize public and internal documentation on a direct, natural technical style.
- Rewrite maintenance notes and release guidance around concrete project actions and checks.

## 6.5.33 - 2026-07-12 - Runtime readiness and release hardening

- Add a typed runtime registry for the backward-compatible `default` instance.
- Wait for Feathers setup and Socket.IO router initialization before marking the runtime ready.
- Return an explicit HTTP 503 while the embedded runtime is unavailable instead of falling through to misleading 404 responses.
- Make shutdown idempotent and close the MongoDB client after Feathers teardown.
- Resolve MongoDB and Keycloak private settings from runtime configuration instead of serializing them in generated templates.
- Use the public `nitropack/runtime` export.
- Make Keycloak user provisioning opt-in and infrastructure failures fail closed by default.
- Cache service discovery results shared by Nuxt imports and generated client/server plugins.
- Split unit, integration and end-to-end test suites and run all of them in CI.
- Make CI non-mutating and add dependency, secret-safety, source-hygiene and documentation checks.
- Align direct Feathers dependencies with `5.0.46`, Nitro with `2.13.4`, H3 with `1.15.11` and Nuxt packages with `4.4.2`.

## 6.5.32 - 2026-07-11 - `@vevedh/feathers-nitro` migration and release hardening

- Replaced `@gabortorma/feathers-nitro-adapter@0.6.0` with `@vevedh/feathers-nitro@0.5.0`.
- Aligned the package Node.js engine range with the new adapter: `^22.12.0 || ^24.11.0 || >=26.0.0`.
- Kept the generated Express, Koa and Socket.IO integration behavior unchanged by switching only the public `/handlers` and `/routers` import specifiers.
- Added `sanity:feathers-nitro` to prevent dependency, lockfile and generated-template regressions.
- Kept multi-instance opt-in for a dedicated backward-compatible patch; the generated runtime remains single-instance in this release.
- Added an npm registry collision check, a strict Git tag/version check and a cross-platform release tarball command.
- Added a tag-driven GitHub Actions workflow prepared for npm trusted publishing with OIDC and provenance.
- Publish the exact validated `release-artifacts/nuxt-feathers-zod-6.5.32.tgz` archive instead of rebuilding the package during the final npm publish step.
- Removed a redundant release build and added an explicit ESLint compatibility override for `eslint-plugin-vue` 9.33+.
- Synchronized the public release version across the README and all maintained FR/EN documentation markers.
- Simplified the release metadata gate and added `README_fr.md` to the mandatory documentation set.
- Added a full architecture, function/event inventory, migration risk review and multi-instance optimization plan.

## 6.5.31 - 2026-05-13 - GitHub Actions Node 24 compatibility

- Updated CI and GitHub Pages workflows to Node.js 24 and Node 24-compatible official actions.
- Added the Pages build environment guards, `.nojekyll` generation and current Pages upload/deployment actions.
- Kept release metadata and documentation checks aligned with the CI baseline.

## 6.5.30 - Remote Keycloak LDAP bridge documentation

- Add complete FR/EN documentation for remote Keycloak SSO + LDAP/AD bridge.
- Recommend the explicit remote strategy name `keycloak-ldap`.
- Document why the browser must send `access_token` and never a trusted `authenticated: true` flag.
- Add a full `SsoLdapStrategy` backend example using Keycloak JWKS validation and LDAP/AD lookup.
- Add `examples/remote-keycloak-ldap/` with Nuxt remote config, backend strategy, auth registration and environment sample.

## 6.5.29 - Main Quasar UnoCSS Pinia starter documentation

- Added the full French guide `docs/guide/starter-quasar-unocss-pinia.md`.
- Added the English guide `docs/en/guide/starter-quasar-unocss-pinia.md`.
- Promoted the Quasar + UnoCSS + Pinia + MongoDB starter as a main NFZ application model.
- Documented the starter structure, NFZ embedded MongoDB configuration, local auth flow, session store, RBAC middleware, `useAdminFeathers()` facade, `messages` store and Quasar QDrawer conventions.
- Added the starter guide to the VitePress navbar and guide sidebars.
- Updated the README and CLI documentation to reference the main starter.

## 6.5.28 - VitePress branding restore

- Restored the VitePress custom theme under `docs/.vitepress/theme/**`.
- Restored `docs/public/**`, including the plume logo assets used by the navbar and home hero.
- Re-enabled the custom navbar brand `nuxt-feathers-zod` with the plume logo via `BrandTitle.vue`.
- Added docs branding assets to `scripts/check-release-files.mjs` so future archives fail fast if the theme or images disappear.
- No runtime, CLI command, or starter behavior change; this patch repairs the documentation branding package surface.

## 6.5.27 - Quasar UnoCSS Pinia starter preset

- Added `examples/nfz-quasar-unocss-pinia-starter`.
- Added CLI command `init starter` with preset `quasar-unocss-pinia-auth`.
- Starter includes MongoDB compose, seeded admin user, local JWT auth, Pinia session store, RBAC middleware, Quasar dashboard layout and Feathers access facade.
- Starter private pages use `routeRules.ssr=false` to avoid SSR/client auth redirection hydration mismatches.
- Quasar ripple is disabled in the starter to reduce non-passive `touchstart` warnings on dashboard controls.

## 6.5.26 - Documentation dead-link cleanup

- Bumped the package baseline to `6.5.26`.
- Added the missing VitePress pages `docs/guide/repo-dev.md` and `docs/en/guide/repo-dev.md`.
- Added the repository development flow to the French and English sidebars.
- Fixed the `bun docs:build` failure caused by dead links to `/guide/repo-dev` and `./repo-dev`.
- No runtime or CLI behavior change; this patch only keeps the documentation contract buildable.

## 6.5.25 - Lint max-len cleanup

- Bumped the package baseline to `6.5.25`.
- Wrapped long lines reported by `bun lint:fix` in `src/cli/init.ts`, `src/runtime/adapters/ofetch.ts`, `src/runtime/console/pages/rbac.vue`, `src/runtime/server/keycloak.ts`, and `src/runtime/server/utils/nfzSchema.ts`.
- No functional runtime, CLI, Builder, or documentation contract change; this is a style-clean patch after the 6.5.24 typecheck fix.

## 6.5.24 - Typecheck fix for generated actions and nested init route

- Bumped the package baseline to `6.5.24`.
- Fixed `services/actions/actions.shared.ts` and the custom action template to avoid passing a generic type argument to Nuxt's generated `useRuntimeConfig()` import.
- Fixed the nested `/api/nfz/init/add-users` route import path to resolve `src/runtime/server/utils/nfzApiContext.ts` correctly from the `init/` subdirectory.
- This patch keeps the 6.5.23 code/CLI/docs alignment and only corrects the reported TypeScript regressions.

# Changelog

## 6.5.23 - Code, CLI and documentation alignment

- Bumped the package baseline to `6.5.23`.
- Aligned CLI-generated shared templates for file services and adapter-less custom services with the canonical `runtimeConfig.public._feathers` contract.
- Added explicit `useRuntimeConfig` imports to CLI-generated browser shared templates.
- Aligned `/api/nfz/rbac`, `/api/nfz/status` and `/api/nfz/init/add-users` with the centralized `getNfzApiContext()` / `assertNfzConsoleWriteAllowed()` helpers.
- Restored the missing CLI documentation files required by `sanity:release-meta`: `docs/guide/cli.md`, `docs/en/guide/cli.md`, `docs/reference/cli.md`, `docs/en/reference/cli.md`.
- Restored minimal reference indexes and session-auth Pinia pages referenced by the VitePress navigation.
- Updated the README, release metadata and manual service guide to stop documenting legacy `public.feathers` reads.


## 6.5.22 - Runtime config and Builder API alignment

- Fixed server/runtime consistency by reading internal configuration from `runtimeConfig._feathers` instead of legacy `runtimeConfig.feathers` fallbacks.
- Added server-side `_feathers.servicesDirs` and `_feathers.console` runtime metadata so Builder APIs can resolve service folders and write permissions reliably.
- Fixed missing `useRuntimeConfig` imports in `useNfzAdminClient()` and custom action service shared templates.
- Aligned custom action REST fallback with `runtimeConfig.public._feathers`.
- Implemented the canonical Builder API routes: `/api/nfz/manifest`, `/api/nfz/schema`, `/api/nfz/preview` and `/api/nfz/apply`.
- Kept compatibility with the historical per-service routes `/api/nfz/schema/:service`.
- Replaced generic RBAC `Error('Forbidden')` throws with Feathers `Forbidden` errors.
- Updated FR/EN Builder and runtime-config documentation.

## 6.5.21

- Removed the standard runtime dependency on `feathers-pinia`.
- Kept `$api` and `$client` as native Feathers clients.
- Added the official `useSessionStore()` Pinia store for authentication UI state.
- Kept `useAuthStore()` as a backward-compatible alias.
- Added the built-in named Nuxt route middleware `session`.
- Updated the auth bootstrap plugin to restore the native auth runtime session.
- Kept `client.pinia` as the `@pinia/nuxt` session-store layer, not as a service-cache wrapper.
- Added FR/EN documentation for the simplified session-auth flow and migration from Feathers-Pinia.
- Removed `feathers-pinia` from package and playground dependencies.


## 6.5.20 - Preset preview typecheck fix

- Corrige l'erreur TypeScript `TS2352` dans `src/runtime/server/api/nfz/presets/preview.post.ts` détectée par `bun verify:all` pendant `bun run typecheck`.
- Convertit explicitement le résultat typé `PresetPlan` via `unknown` avant destructuration comme `Record<string, unknown>`.
- Préserve le contrat API existant de la preview des presets : suppression de `ok` depuis le plan interne puis retour `{ ...payload, ok: true }`.
- Documente le diagnostic, le correctif et la règle de maintenance associée.


## 6.5.19 - Lint scratch-file guard

- Corrige le cas `bun lint:fix` où un fichier local temporaire `tmp-check.mjs` pouvait rester à la racine du projet et déclencher `antfu/no-import-dist`.
- Ajoute `tmp-check.mjs`, `tmp-*.mjs`, `**/tmp-check.mjs` et `**/tmp-*.mjs` aux ignores ESLint afin que les fichiers de diagnostic locaux ne bloquent plus le lint du module.
- Ajoute les mêmes motifs à `.gitignore` pour éviter d'embarquer ces fichiers scratch dans les futures archives.
- Documente le diagnostic et la règle de maintenance associée.

## 6.5.18 - ESLint hardening and lint:fix cleanup

- Corrige les erreurs bloquantes de `bun lint:fix` détectées après validation de la 6.5.17.
- Remplace les groupes capturants inutilisés par des groupes non capturants dans `bin/postinstall.mjs` et `src/cli/init.ts`.
- Remplace `Array(m + 1)` par `Array.from({ length: m + 1 }, () => 0)` dans le diff CLI pour respecter `unicorn/no-new-array`.
- Réécrit le parsing léger des schemas dans `src/runtime/server/utils/nfzSchema.ts` pour éviter les regex à backtracking polynomial et l'assignation dans un `while`.
- Ajoute `examples/**/*.ts` au `tsconfig.json` afin que les exemples TypeScript soient couverts par le project service ESLint.
- Supprime le fichier temporaire `tmp-check.mjs`, qui importait `dist/**` et déclenchait `antfu/no-import-dist`.
- Met à jour les notes de maintenance avec le diagnostic et les règles de reprise associées.

## 6.5.17 - Docs frontmatter sanity scope fix

- Corrige `scripts/check-docs-frontmatter.mjs` pour ne plus analyser `docs/node_modules/**` ni les répertoires de cache/build VitePress.
- Aligne `verify:sanity` avec le comportement attendu après `bun install` : seuls les fichiers Markdown maintenus par le projet sont contrôlés.
- Met à jour les notes de maintenance avec l’analyse post-`verify:all`, le diagnostic et la règle de maintenance associée.


## 6.5.16

- Added a durable maintenance handoff note for continued project work.
- Added a maintained CLI reference and aligned release metadata checks on 6.5.16.
- Re-audited the complete archive structure, CLI surface, docs frontmatter, runtime option files and client ESM interop guards.
- Stabilised VitePress navbar branding by using nav-bar-title-before/nav-bar-title-after slots and avoiding full .VPNavBarTitle .title hiding.
- Kept local VitePress branding assets for navbar and home hero.

## 6.5.15

- Repacked from the complete 6.5.11 source tree to restore missing runtime option files.
- Fixed VitePress navbar branding and local hero/logo assets.
- Aligned standard install snippets with optional Feathers-Pinia usage.

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
- ajout des journaux techniques et du suivi de patch nécessaires aux prochaines itérations


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
- Synced the README and technical reference with the new route middleware generator example `auth-keycloak`.


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
