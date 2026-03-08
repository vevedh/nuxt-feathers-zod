---
editLink: false
---
# Support policy

## What is supported in the standard core

Priority support covers:

- Nuxt 4
- Bun
- embedded / remote
- REST / Socket.IO
- Express / Koa
- local / JWT auth
- Keycloak SSO bridge
- generation CLI
- optional legacy Swagger

## What gets priority when fixing regressions

When a regression appears, these flows should be protected first:

1. new Nuxt 4 app + `init embedded`
2. embedded + `users` + local auth
3. remote REST
4. remote Socket.IO
5. Keycloak bridge

## Deprecations

Historical aliases may remain supported, but:

- they must stop being the recommended form
- the docs must show the canonical form
- the change must be tracked in `PATCHLOG.md`

## Fix policy

A core fix should prefer:

- backward compatibility when reasonable
- an updated minimal example
- aligned FR/EN docs
- traceability in `PATCHLOG.md` and `PROMPT_CONTEXT.md`
