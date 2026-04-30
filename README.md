# nuxt-feathers-zod

> Nuxt 4 module for FeathersJS v5 (Dove) with a CLI-first workflow and optional Zod-first service generation.

**Current stable release:** `6.5.29`

- Documentation: `https://vevedh.github.io/nuxt-feathers-zod/`
- Quick start: `docs/guide/getting-started.md`
- Main starter: `docs/guide/starter-quasar-unocss-pinia.md`
- CLI reference: `docs/reference/cli.md`
- Community workflow: `docs/guide/community-workflow.md`
- Release discipline: `RELEASE_CHECKLIST.md`

## What it is

`nuxt-feathers-zod` helps you build or consume a FeathersJS backend from a Nuxt 4 application with a consistent module + CLI workflow.

It supports two main modes:

- **embedded** — a Feathers server runs inside Nuxt/Nitro
- **remote** — a Nuxt app uses a typed Feathers client against an external API

## What it is for

Use NFZ when you want:

- a **Nuxt-native backend-first architecture**
- Feathers services generated through a **deterministic CLI**
- shared types and optional **Zod-first** service schemas
- **local/JWT auth** or a **Keycloak SSO** integration path
- client-side helpers for **Pinia / store session**
- an official **Quasar + UnoCSS + Pinia starter** with MongoDB, seeded auth and RBAC
- a path toward **MongoDB management**, diagnostics and builder tooling

## What the OSS module includes

- Nuxt 4 + Nitro integration
- embedded and remote modes
- REST and Socket.IO transports
- embedded server with Express or Koa
- CLI bootstrap for embedded and remote projects
- CLI generation for services, remote services, middleware and server modules
- schema modes `none | zod | json`
- local/JWT auth flows
- Keycloak bridge for remote mode
- optional legacy Swagger support
- template overrides
- optional MongoDB management surface via `database.mongo.management`
- official starter template under `examples/nfz-quasar-unocss-pinia-starter`
- release checks with build, typecheck, E2E and tarball smoke validation

## Main application starter

For a full Nuxt 4 application with Quasar 2, UnoCSS, Pinia, MongoDB, seeded local auth, route middleware, RBAC and an encapsulated Feathers access layer:

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

The starter is documented in `docs/guide/starter-quasar-unocss-pinia.md` and maintained under `examples/nfz-quasar-unocss-pinia-starter`.

## 5-minute embedded path

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod @pinia/nuxt pinia
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Recommended rules

1. **Initialize the module first.**
2. **Generate services through the CLI.**
3. **Do not hand-create the first service files.**
4. **Keep `feathers.servicesDirs = ['services']` unless you have a documented reason to change it.**

Those four rules avoid the most common scan, auth entity and export mismatches.

## Install

```bash
bun add nuxt-feathers-zod @pinia/nuxt pinia
```

Optional Swagger dependencies:

```bash
bun add feathers-swagger swagger-ui-dist
```

## Quick links

- Embedded quick start: `docs/guide/getting-started.md`
- Main Quasar + UnoCSS + Pinia starter: `docs/guide/starter-quasar-unocss-pinia.md`
- Remote mode: `docs/guide/remote.md`
- Local auth: `docs/guide/auth-local.md`
- Keycloak SSO: `docs/guide/keycloak-sso.md`
- File upload/download starter: `docs/guide/file-upload-download.md`
- Troubleshooting: `docs/guide/troubleshooting.md`
- Publishing workflow: `docs/guide/publishing.md`

## Repository workflow

The repository is now organized around public source code, docs, tests and release tooling.
Historical maintainer notes were moved under `archives/`.

Useful public root files:

- `CONTRIBUTING.md`
- `RELEASE_CHECKLIST.md`
- `REPO_DEV.md`

## Recommended release checks

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## License

MIT


<!-- release-version: 6.5.11 -->


<!-- release-version: 6.5.16 -->


<!-- release-version: 6.5.18 -->


<!-- release-version: 6.5.19 -->


<!-- release-version: 6.5.21 -->


<!-- release-version: 6.5.22 -->


<!-- release-version: 6.5.29 -->
