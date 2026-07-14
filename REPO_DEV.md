# Repository development flow

Use this guide when working inside the `nuxt-feathers-zod` repository itself.

## Safe bootstrap

From a freshly extracted archive, install dependencies before invoking any Nuxt CLI command:

```bash
bun install --frozen-lockfile
bun run clean:repo
```

For a complete clean verification and development startup:

```bash
bun run dev:fresh
```

On Windows, the complete non-interactive verification is available with:

```powershell
bun run verify:windows
```

`clean:repo` uses only Node.js file-system APIs, so it does not depend on a previously installed `@nuxt/kit` package.

## Recommended verification flow

```bash
bun run typecheck
bun run lint
bun run test
bun run playground:build
bun run docs:build
bun run verify:sanity
```

For a release candidate, run:

```bash
bun run release:check:full
```

## Repository layout

- `src/` — module source
- `docs/` — public documentation (FR/EN)
- `test/` — fixtures, E2E and smoke support
- `scripts/` — repository automation and release guards
- `archives/` — historical maintainer material not needed for production

## Public tree and local notes

The public repository contains product source, tests, examples, documentation and release records. Local maintenance notes stay outside the tracked tree. `.gitignore` excludes the local maintenance workspace so it can remain on a developer machine without appearing in commits.

Before committing, run:

```bash
bun run sanity:public-repository
```

## Release discipline

The public release workflow should keep these signals green:

- `build`
- `typecheck`
- `test`
- `playground:build`
- `docs:build`
- `sanity:public-repository`
- `sanity:package-exports`
- `sanity:project-coherence`

## Legacy tracked maintenance files

If `sanity:public-repository` reports ignored maintenance files as tracked, run `bun run repo:clean-maintenance-index` and review `git status --short`. The cleanup uses `git rm --cached` for matching maintenance paths, so local files are preserved.
