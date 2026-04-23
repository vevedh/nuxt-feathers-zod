# Release Checklist

Use this checklist before publishing a new OSS version of `nuxt-feathers-zod`.

## 1. Repository state

- [ ] `package.json` version updated
- [ ] `CHANGELOG.md` updated
- [ ] README / docs aligned with the released behavior
- [ ] no temporary patch files left at the repository root

## 2. Core validation

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## 3. Packaging validation

- [ ] `bun run sanity:package-exports`
- [ ] `bun run sanity:cli-dist-meta`
- [ ] `bun pm pack --dry-run`

## 4. Runtime confidence

- [ ] playground boots in embedded mode
- [ ] local auth smoke path works
- [ ] Mongo management smoke path works when enabled
- [ ] linked-package and tarball consumer validation both pass

## 5. Docs and community

- [ ] `CONTRIBUTING.md` still matches the repository workflow
- [ ] `README.md` and `README_fr.md` match the release behavior
- [ ] docs pages for support/release/community/publishing are aligned in FR/EN
- [ ] public package subpaths used by generated templates remain documented and exported
