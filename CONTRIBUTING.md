# Contributing to nuxt-feathers-zod

Thanks for helping improve `nuxt-feathers-zod`.

## Scope

This repository is the public OSS module. Contributions should prioritize:

- Nuxt 4 compatibility
- embedded and remote modes
- REST and Socket.IO
- local/JWT auth and Keycloak bridge stability
- deterministic CLI generation
- packaging / exports / release reliability
- tests that improve confidence for real consumers
- documentation that helps new users understand the module quickly

## Recommended local workflow

```bash
bun install --frozen-lockfile
bun run clean:repo
bun run build
bun run typecheck
bun run test
bun run smoke:tarball
```

Do not invoke `bunx nuxi cleanup` before the first installation. Without a local Nuxt CLI, `bunx` may execute a globally cached `nuxi` that cannot resolve the repository dependencies.

Windows contributors can run the full local gate with `bun run verify:windows`.

For quick checks while iterating:

```bash
bun run dev
```

## Before opening a PR

Please make sure the following pass locally:

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

If your patch changes public behavior, also update:

- `README.md`
- `README_fr.md`
- the relevant `docs/guide/*` and `docs/en/guide/*` pages
- `CHANGELOG.md`

If your patch changes release or packaging behavior, run the complete release gate and describe the impact in the pull request. Maintainer-only release procedures are kept outside the public repository.

## Repository hygiene

The repository root should stay focused on the public module. Maintainer notes, patch memory and private VitePress documentation must remain ignored by Git.

## Preferred patch style

Good patches are:

- small enough to review
- typed
- aligned with Nuxt module conventions
- covered by at least one practical validation path
- documented when public behavior changes
