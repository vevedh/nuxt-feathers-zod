---
editLink: false
---
# Compatibility matrix

This matrix defines the **targeted and validated** scope for the open source core.

## Target versions

- **Bun**: 1.3.x
- **Nuxt**: 4.x
- **Nitro**: 2.x through Nuxt 4
- **Vue**: 3.5.x through Nuxt 4
- **FeathersJS**: v5 (Dove)
- **TypeScript**: 5.x

## Scenarios the core must keep supporting

| Scenario | Expected status | Notes |
| --- | --- | --- |
| Nuxt 4 + embedded + memory | Stable | Recommended entry point |
| Nuxt 4 + embedded + MongoDB | Stable | CLI generation recommended |
| Nuxt 4 + embedded + local/JWT auth | Stable | `users` service through CLI |
| Nuxt 4 + remote REST | Stable | Remote services declared explicitly |
| Nuxt 4 + remote Socket.IO | Stable | Same explicit remote-service pattern |
| Keycloak SSO bridge | Stable when configured correctly | Needs real environment validation |
| Legacy Swagger | Optional stable | Requires `feathers-swagger` + `swagger-ui-dist` |

## Priority validation platforms

- Windows 11 + Bun
- Linux + Bun

## Invariants to preserve

- `servicesDirs: ['services']` as the public recommended convention
- CLI-first bootstrap and generation
- `memory` as the default adapter
- `--schema none` as the default schema mode
- historical aliases remain supported but are not foregrounded

## Recommended smoke-test command

```bash
bun install
bun run build
bun run docs:build
```
