# Changelog

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
