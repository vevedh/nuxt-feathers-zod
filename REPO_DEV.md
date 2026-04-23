# Repository development flow

Use this guide when working inside the `nuxt-feathers-zod` repository itself.

## Safe bootstrap

```bash
bun run clean:repo
bun install
```

## Recommended verification flow

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Repository layout

- `src/` — module source
- `docs/` — public documentation (FR/EN)
- `test/` — fixtures, E2E and smoke support
- `scripts/` — repository automation and release guards
- `archives/` — historical maintainer material not needed for production

## Release discipline

The public release workflow should keep these signals green:

- `build`
- `typecheck`
- `test:e2e`
- `smoke:tarball`
- `sanity:package-exports`
- `sanity:cli-dist-meta`
