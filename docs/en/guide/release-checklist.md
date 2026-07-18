---
editLink: false
---
# Release checklist

This checklist covers the checks actually used for a `nuxt-feathers-zod` release.

## 1. Verify the release identity

```bash
bun run release:check:registry
bun run release:tag:check -- vX.Y.Z
```

The tag must exactly match the version in `package.json`.

## 2. Verify the public tree

```bash
bun run sanity:public-repository
bun run sanity:source-hygiene
```

The public repository should contain only module source, tests, examples, documentation and useful release files.

## 3. Validate the module

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run playground:build
bun run docs:build
bun run verify:sanity
```

`bun run test` executes unit, integration and isolated end-to-end suites.

## 4. Build the exact tarball

```bash
bun run release:pack
bun run sanity:package-exports
bun run sanity:cli-dist-meta
```

The validated tarball is written to `release-artifacts/`. Publish that exact archive without rebuilding it in between.

## 5. Check the playground

Before tagging the release, verify at least:

- local authentication;
- Feathers REST and Socket.IO services;
- service discovery in the Builder Console;
- MongoDB diagnostics when MongoDB is enabled;
- `embedded` and `remote` scenarios that apply to the release.

## 6. Check the documentation

```bash
bun run docs:check-links
bun run docs:check-human-style
bun run docs:check-branding
```

French and English guides must describe the same public contracts and the CLI commands that actually exist.

## Publishing

See [npm and GitHub publishing](./publishing).

<!-- release-version: 6.5.49 -->
