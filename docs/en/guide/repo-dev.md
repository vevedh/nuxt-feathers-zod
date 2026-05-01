---
editLink: false
---
# Repository development flow

This page documents the recommended maintainer flow for evolving `nuxt-feathers-zod` without desynchronizing code, CLI commands, and documentation.

## Goal

Every patch must keep the same contract across:

- the generated Nuxt/Feathers runtime;
- CLI commands and generated templates;
- the VitePress documentation;
- validation and packaging scripts.

## Recommended workflow

```bash
bun install
bun run typecheck
bun run lint:fix
bun run docs:build
bun run verify:all
npm pack
```

For a release patch, also update:

- `package.json`;
- `README.md` and `README_fr.md`;
- `CHANGELOG.md`;
- public release notes;
- VitePress pages impacted by the change.

## Consistency rules

### RuntimeConfig

The official runtime contract uses:

```ts
runtimeConfig._feathers
runtimeConfig.public._feathers
```

Legacy paths such as `runtimeConfig.feathers` and `runtimeConfig.public.feathers` must not be introduced in generated code.

### Browser client

Runtime files served to the browser must avoid fragile ESM/CJS imports from `@feathersjs/*` and `feathers-pinia`.

The standard contract remains:

- native Feathers client exposed as `$api`, `$client`, `$feathersClient`;
- Pinia used for the application session;
- `feathers-pinia` optional, not required for the standard auth runtime.

### Documentation

Before publishing, `bun docs:build` must pass without dead links. Internal links must point to pages that actually exist under `docs/`.

## See also

- [npm & Git publishing](./publishing)
- [Release checklist](./release-checklist)
- [Community workflow](./community-workflow)
- [CLI reference](/en/reference/cli)

<!-- release-version: 6.5.26 -->
