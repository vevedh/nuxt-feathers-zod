---
title: Dependency maintenance with taze
description: Controlled dependency update procedure for nuxt-feathers-zod with taze, Bun and the NFZ validation matrix.
---

# Dependency maintenance with taze

`nuxt-feathers-zod` uses `taze` as a controlled dependency maintenance tool.

The goal is not to upgrade everything blindly, but to evolve the project through verified steps: audit, patch, minor, tests, CLI smoke, module build, then validation in a consumer application such as NFZ Studio.

## General rule

```txt
Taze proposes and applies updates.
The NFZ validation matrix validates the result.
npm publishing only happens after tests pass.
```

## Available scripts

```bash
bun run deps:check
bun run deps:check:recursive
bun run deps:update:patch
bun run deps:update:minor
bun run deps:update:latest
bun run deps:update:major
```

Recommended safe commands:

```bash
bun run deps:update:safe
bun run deps:update:minor:safe
```

They run:

```txt
taze patch/minor -w
bun install
verify:all matrix
```

## Validation matrix

After an update, run:

```bash
bun run verify:all
```

This command groups:

```bash
bun run build
bun run typecheck
bun test
bun run cli:build
bun run cli:smoke
bun run cli:full-smoke
bun run sanity:release-meta
bun run sanity:package-exports
bun run sanity:cli-dist-meta
bun run docs:check-frontmatter
```

To also verify that the lockfile is strictly respected:

```bash
bun run verify:full
```

## Full CLI smoke

The script:

```bash
bun run cli:full-smoke
```

checks critical commands:

```txt
nuxt-feathers-zod --help
nuxt-feathers-zod doctor
nuxt-feathers-zod init embedded --dry
nuxt-feathers-zod init remote --dry
nuxt-feathers-zod init templates --dry
nuxt-feathers-zod add service users --dry
nuxt-feathers-zod add file-service uploads --dry
nuxt-feathers-zod add middleware auth-keycloak --target route --dry
nuxt-feathers-zod add mongodb-compose --dry
nuxt-feathers-zod mongo management --dry
nuxt-feathers-zod remote auth keycloak --dry
```

This protects the most sensitive parts of the module: template generation, Nuxt configuration, remote commands, MongoDB management, Keycloak and packaged CLI behavior.

## Recommended workflow

```bash
bun run deps:check
bun run deps:update:safe
bun run deps:update:minor:safe
bun run build
npm pack
```

Then validate the generated tarball in a consumer application such as NFZ Studio:

```bash
bun add ../nuxt-feathers-zod/nuxt-feathers-zod-<version>.tgz
bun dev
```

This is closer to a real npm installation than a simple `file://../nuxt-feathers-zod-main` dependency.

## Packages to monitor closely

```txt
nuxt / nitropack / @nuxt/kit / @nuxt/schema
vite / vue / vue-router
pinia / feathers-pinia
@feathersjs/*
@feathersjs/mongodb / mongodb
quasar / @quasar/extras
zod
typescript / vitest / eslint
```

Major updates must be handled by package group, never through a blind global upgrade.

## Publishing

Before `npm publish`:

```bash
bun install --frozen-lockfile
bun run verify:all
bun run build
npm pack
```

Publish only after the local tarball has been validated in a consumer application.
