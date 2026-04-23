---
editLink: false
---
# Release checklist

The official maintainer checklist also lives at the repository root in `RELEASE_CHECKLIST.md`.

This public page summarizes the minimum release discipline expected before publishing.

## Public checks to keep green

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

## Publishing

See the dedicated guide: [npm & Git publishing](./publishing)

## See also

- [Community workflow](./community-workflow)
- [Repository development flow](./repo-dev)
- [Support policy](./support-policy.md)
