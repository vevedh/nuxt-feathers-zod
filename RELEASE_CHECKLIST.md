# Release Checklist

Use this checklist before publishing a new `nuxt-feathers-zod` version.

## 1. Release identity

- [ ] `package.json` contains the intended version.
- [ ] `bun run release:check:registry` confirms that the version is available on npm.
- [ ] `bun run release:tag:check -- vX.Y.Z` accepts the intended Git tag.
- [ ] `CHANGELOG.md` and the release notes describe the delivered behavior.

## 2. Public repository state

- [ ] `bun run sanity:public-repository` passes.
- [ ] `bun run sanity:source-hygiene` passes.
- [ ] `git status --short` contains no generated output, local note or temporary file.
- [ ] `README.md`, `README_fr.md` and the VitePress guides match the current runtime and CLI.

## 3. Runtime and test validation

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run playground:build
bun run docs:build
bun run verify:sanity
```

Expected coverage includes unit, integration and isolated end-to-end suites.

## 4. Packaging validation

```bash
bun run release:pack
bun run sanity:package-exports
bun run sanity:cli-dist-meta
npm publish ./release-artifacts/nuxt-feathers-zod-X.Y.Z.tgz --access public --dry-run
```

Inspect and test the exact tarball produced in `release-artifacts/`. Do not rebuild between final validation and publication.

## 5. Runtime confidence

- [ ] The playground starts in embedded mode.
- [ ] Local authentication succeeds.
- [ ] Feathers REST and Socket.IO scenarios pass.
- [ ] Builder discovery lists the current services.
- [ ] MongoDB diagnostics work when MongoDB is enabled.
- [ ] The tarball installs in a clean Nuxt 4 consumer fixture.

## 6. Documentation and project links

- [ ] `bun run docs:check-links` passes.
- [ ] `bun run docs:check-human-style` passes.
- [ ] `bun run docs:check-branding` confirms the NFZ logo, favicon, GitHub and npm links.
- [ ] French and English reference pages describe the same public contracts.

## 7. Publish

Recommended tag-driven path:

```bash
git tag -a vX.Y.Z -m "nuxt-feathers-zod vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

The GitHub workflow validates and publishes the exact release archive through npm Trusted Publishing.

Manual fallback with an authenticated npm session and 2FA:

```bash
bun run publish:npm
```
