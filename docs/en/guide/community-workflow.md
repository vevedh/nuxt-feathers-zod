---
editLink: false
---
# Community workflow

This page summarizes the public repository discipline for `nuxt-feathers-zod`.

## Goal

Keep the repository focused on:

- module source code
- public documentation
- tests and smoke tests
- release tooling

Historical or internal maintainer material is moved to `archives/`.

## Recommended verification flow

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Important root files

- `README.md`
- `README_fr.md`
- `CONTRIBUTING.md`
- `RELEASE_CHECKLIST.md`
- `REPO_DEV.md`

## Why `test:e2e` and `smoke:tarball` matter

- `test:e2e` protects the most important embedded flows
- `smoke:tarball` validates the packed module the same way a real consumer installs it

## Recommended reading order for new contributors

1. `README.md`
2. [Getting started](/en/guide/getting-started)
3. [Community workflow](/en/guide/community-workflow)
4. [Release checklist](/en/guide/release-checklist)
5. [npm & Git publishing](/en/guide/publishing)
