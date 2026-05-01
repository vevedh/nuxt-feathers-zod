# Docs audit — 2026-05-01

## Scope

Archive analysed for documentation refactor of `nuxt-feathers-zod` 6.5.29.

## Markdown inventory

All Markdown files outside generated or VCS folders were inventoried before the documentation rewrite.

- Total Markdown files: 168
- Main historical sources reviewed:
  - `AI_CONTEXT/*.md`
  - `archives/*.md`
  - root `README*.md`, `CHANGELOG.md`, `TODO.md`, `RELEASE_CHECKLIST.md`
  - `docs/guide/*.md`
  - `docs/reference/*.md`
  - `examples/nfz-quasar-unocss-pinia-starter/*.md`
  - `playground/*.md`
  - `services/actions/README.md`
  - `templates/custom-service-action/README.md`

## Source inventory

The module source was reviewed structurally by folder:

- `src/module.ts`: Nuxt module entrypoint, defaults, setup pipeline.
- `src/setup/*`: runtime config, aliases, server layer, client layer, type includes, devtools/MCP integration.
- `src/runtime/options/*`: option families for client, auth, database, server, transports, templates, validator, swagger and console.
- `src/runtime/templates/*`: generated runtime client/server files.
- `src/runtime/server/*`: embedded runtime helpers, MongoDB infrastructure, RBAC, NFZ API endpoints.
- `src/runtime/composables/*`: client composables for auth, protected resources, builder/admin/mongo clients.
- `src/runtime/stores/*`: auth/session stores.
- `src/cli/*`: citty CLI, generators, Nuxt config patching, doctor diagnostics.
- `src/core/presets/*`: preset planning and application logic.
- `examples/nfz-quasar-unocss-pinia-starter/*`: main production-grade starter reference.
- `playground/*`: smoke/test playground routes and examples.

## Documentation changes applied

Core VitePress documentation was reorganized around developer journeys while preserving existing branding files and images.

Updated or added:

- `docs/index.md`
- `docs/guide/complete-guide.md`
- `docs/guide/getting-started.md`
- `docs/guide/modes.md`
- `docs/guide/services.md`
- `docs/guide/cli.md`
- `docs/reference/index.md`
- `docs/reference/architecture.md`
- `docs/reference/configuration.md`
- `docs/reference/options.md`
- `docs/reference/cli.md`
- `docs/.vitepress/config.mts`

Preserved untouched:

- `docs/.vitepress/theme/components/BrandTitle.vue`
- `docs/.vitepress/theme/components/BrandTitleAfter.vue`
- `docs/.vitepress/theme/index.ts`
- `docs/public/images/plume-dark.png`
- `docs/public/images/plume-light.png`
- hero image reference in `docs/index.md`

## Documentation principles

- One primary entry page: `Guide complet`.
- `Démarrage rapide` reduced to an executable first path.
- `Modes`, `Services`, `Options`, `CLI` made explicit and developer-oriented.
- CLI reference aligned with `src/cli/core.ts` help content.
- Options reference aligned with `src/runtime/options/*`.
- Existing specialized pages kept for deeper topics.
