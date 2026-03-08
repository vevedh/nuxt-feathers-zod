# Release checklist

This checklist freezes the minimum open-source release process for `nuxt-feathers-zod`.

## Before release

- make sure `PATCHLOG.md` and `PROMPT_CONTEXT.md` are up to date
- verify that `README.md` reflects the actually stable feature set
- bump the package version at the right level (`patch`, `minor`, `major`)
- ensure internal documentation pages are excluded from the public production build

## Local verification

```bash
bun install
bun run lint
bun run sanity:templates
bun run prepare
bun run build
bun run docs:build
```

## Recommended functional checks

- minimal embedded mode
- embedded + local auth + swagger
- remote REST
- remote Socket.IO
- adapter-less service generation with custom methods
- VitePress documentation build

## Manual npm publish

```bash
npm login
npm whoami
npm pack --dry-run
npm version patch
npm publish --access public
```

## Beta publish

```bash
npm version prerelease --preid beta
npm publish --tag beta --access public
```

## After publish

- push the commit and Git tags
- verify the published npm version
- verify the public documentation matches the published version
