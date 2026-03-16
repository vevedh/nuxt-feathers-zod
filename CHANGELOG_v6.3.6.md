# Changelog

## v6.3.6 - 2026-03-15

### Added
- Added embedded Mongo management support with explicit runtime mounting in `server/mongodb.ts`.
- Added CLI command `mongo management` to configure Mongo management in `nuxt.config`.
- Added CLI surface for OSS assets management:
  - `templates list`
  - `templates init`
  - `plugins list`
  - `plugins add <name>`
  - `modules list`
  - `modules add <name>`
  - `middlewares list`
  - `middlewares add <name>`
- Added `doctor` diagnostics for Mongo management:
  - redacts Mongo credentials
  - reports normalized `basePath`
  - reports exposed route surface
  - warns when management is enabled without `database.mongo.url`
- Added dedicated Mongo playground page for embedded Mongo management testing.
- Added `CHANGELOG.md` to support release workflows.

### Changed
- Aligned documentation with the official OSS CLI surface.
- Updated docs/build scripts to use `bunx vitepress ...` for reliable Bun + VitePress execution.
- Aligned the NFZ DevTools tab theme with the parent Nuxt DevTools theme by default, including startup sync and live theme changes.
- Stabilized release packaging and docs for the official 6.3.x line.
- Normalized Mongo management `basePath` handling across runtime, CLI, playground, and docs.

### Fixed
- Fixed embedded SSR base URL resolution for memory mode.
- Fixed remote/embedded test page URL construction so embedded mode no longer attempts invalid remote URL resolution.
- Fixed hydration mismatches in remote socket diagnostics.
- Fixed embedded REST dispatch issues for `/feathers/**` routes in browser-direct access scenarios.
- Fixed Mongo management route mounting in embedded mode by mounting services explicitly in the generated Feathers server runtime.
- Fixed legacy/canonical Mongo route handling around `/mongo` and `/mongo/databases`.
- Fixed CLI boolean coercion for flags such as `--auth false`.
- Fixed multiple CLI test stability issues on Bun/Windows by splitting heavy matrix tests.
- Fixed `doctor` tests and CLI generator tests for current helper names:
  - `defineFeathersServerPlugin`
  - `defineFeathersServerModule`
- Fixed docs build command resolution under Bun.
- Fixed release blocking template issues in `src/runtime/templates/server/keycloak.ts`.
- Fixed lint/project-service issues enough to restore release validation flow.

### Tests
- Restored green validation baseline:
  - typecheck OK
  - tests OK
  - docs build fixed
- Current validated suite:
  - 115 passing tests
  - 0 failing tests

### Release notes
This release stabilizes the official Nuxt 4 OSS reference for `nuxt-feathers-zod`, with embedded Mongo management, expanded CLI coverage, aligned documentation, corrected docs build under Bun, and DevTools theme synchronization with the parent Nuxt DevTools UI.
