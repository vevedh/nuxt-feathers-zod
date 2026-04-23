---
editLink: false
---
# npm & Git publishing

This page summarizes the recommended path to publish `nuxt-feathers-zod` to **Git** and **npm**.

## Goal

Publish a package that has been validated as a real consumer artifact, not just a repository that builds locally.

## Minimum checks

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Useful packaging checks

```bash
bun run sanity:package-exports
bun run sanity:cli-dist-meta
bun pm pack --dry-run
```

## Recommended path

### 1. Prepare the version

- update `package.json`
- update `CHANGELOG.md`
- align `README.md`, `README_fr.md` and the relevant public guides

### 2. Verify the repository

- no temporary files left at the repository root
- FR/EN docs aligned
- `archives/` untouched unless you intentionally archive new historical material

### 3. Run the full validation flow

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

### 4. Publish on Git

Recommended workflow:

```bash
git checkout -b release/vX.Y.Z
git add .
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push origin HEAD --tags
```

### 5. Publish on npm

After the final checks pass:

```bash
npm publish
```

> Adjust the npm dist-tag (`latest`, `next`, etc.) to your release strategy.

## Do not forget

- public subpaths used by generated templates must remain exported
- the packed CLI must remain runnable from the tarball
- tarball smoke matters more than a local build alone

## See also

- [Release checklist](/en/guide/release-checklist)
- [Community workflow](/en/guide/community-workflow)
- [Repository development flow](/en/guide/repo-dev)
