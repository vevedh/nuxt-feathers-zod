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
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run playground:build
bun run docs:build
bun run verify:sanity
```

For a release patch, also update:

- `package.json`;
- `README.md` and `README_fr.md`;
- `CHANGELOG.md`;
- public release notes;
- VitePress pages impacted by the change.

## Public tree and local notes

The public repository contains the module source, tests, examples, documentation and release files. Local maintenance notes stay outside the Git-tracked tree.

Before a commit or release, run:

```bash
bun run sanity:public-repository
```

The check rejects local tracking directories and internal reports from the public tree.

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

Before publishing, `bun run docs:build` must pass without dead links. Internal links must point to pages that actually exist under `docs/`.

## See also

- [npm & Git publishing](./publishing)
- [Release checklist](./release-checklist)
- [Community workflow](./community-workflow)
- [CLI reference](/en/reference/cli)

<!-- release-version: 6.5.47 -->

## Cleaning a legacy Git index

After migrating from an older repository version, maintenance files may remain tracked even when `.gitignore` now excludes them. `sanity:public-repository` intentionally rejects those tracked paths.

Run:

```bash
bun run repo:clean-maintenance-index
git status --short
```

The command only removes maintenance paths from the Git index with `git rm --cached`. Local files stay on disk and remain ignored by Git.
