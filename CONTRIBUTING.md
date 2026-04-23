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
bun run clean:repo
bun install
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

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

If your patch changes release or packaging behavior, also review:

- `RELEASE_CHECKLIST.md`
- `docs/guide/publishing.md`
- `docs/en/guide/publishing.md`

## Repository hygiene

The repository root should stay focused on the public module. Historical maintainer notes and patch-era files belong in `archives/`.

## Preferred patch style

Good patches are:

- small enough to review
- typed
- aligned with Nuxt module conventions
- covered by at least one practical validation path
- documented when public behavior changes
