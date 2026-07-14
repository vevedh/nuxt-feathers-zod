---
editLink: false
---
# npm and GitHub publishing

This procedure publishes a validated `nuxt-feathers-zod` release without storing a long-lived npm publishing token in GitHub.

## Initial npm configuration

Configure a GitHub Actions **Trusted Publisher** for the `nuxt-feathers-zod` package with:

- repository: `vevedh/nuxt-feathers-zod`;
- workflow: `.github/workflows/publish-npm.yml`;
- npm environment: leave empty unless a dedicated GitHub environment is later added to the workflow.

The OIDC trust relationship must exist before the first release tag is pushed.

## Available checks

```bash
bun run release:check:registry
bun run release:check:full
bun run release:pack
```

The following command runs the checks, creates the local tarball and simulates the publish operation:

```bash
bun run publish:npm:dry-run
```

## Prepare a release

1. bump `package.json`;
2. finalize `CHANGELOG.md`;
3. run `bun run sync:release-meta`;
4. update `CHANGELOG.md`, `PATCHLOG.md` and the release notes;
5. confirm with `bun run release:check:registry` that the version is available.

## Complete local validation

```bash
bun install --frozen-lockfile
bun run release:prepare:publish
```

The tarball is written to `release-artifacts/`. Test it as a dependency of a Nuxt 4 consumer application before creating the tag.

## Recommended tag-driven publish

```bash
git checkout main
git pull --ff-only
git add .
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "nuxt-feathers-zod vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

The workflow checks that the tag exactly matches `package.json`, verifies that the version is not already on npm, installs the frozen Bun lockfile, runs the full release validation and publishes through npm Trusted Publishing.

## Manual fallback

Local publishing remains available when an npm session with 2FA is active:

```bash
bun run publish:npm
```

Never store an npm token in plain text in `.npmrc`, `.env`, a script or an archive.

## Publishing invariants

- `@vevedh/feathers-nitro@0.5.0` is the only allowed Nitro adapter;
- the generated runtime remains single-instance;
- public `/handlers` and `/routers` exports are used;
- Node.js must satisfy `^22.12.0 || ^24.11.0 || >=26.0.0`;
- the release tag must exactly match the version in `package.json`.

<!-- release-version: 6.5.41 -->
