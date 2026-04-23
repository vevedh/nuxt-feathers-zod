---
editLink: false
---
# Support policy

## What gets priority support

The priority core covers:

- Nuxt 4
- Bun
- embedded / remote
- REST / Socket.IO
- Express / Koa
- local / JWT auth
- Keycloak SSO bridge
- generation CLI
- opt-in MongoDB management
- npm packaging with validated exported subpaths

## Flows to protect first

When a regression appears, protect these flows first:

1. new Nuxt 4 app + `init embedded`
2. embedded + local auth
3. remote REST
4. remote Socket.IO
5. `bunx nuxt-feathers-zod --help`
6. `bun run test:e2e`
7. `bun run smoke:tarball`

## Fix policy

A core fix should prefer:

- backward compatibility when reasonable
- an updated minimal example
- aligned FR/EN docs
- real validation through build, typecheck, E2E or tarball smoke depending on scope

## Repository hygiene

The repository root should stay focused on the public module. Historical maintainer notes are moved into `archives/`.
