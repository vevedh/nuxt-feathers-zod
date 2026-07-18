# Documentation plan

`nuxt-feathers-zod` integrates Feathers into Nitro or connects Nuxt to a remote Feathers API. Its application contract is **Feathers-first**: services, methods, events, hooks, and authentication rules belong to Feathers. Nitro hosts the runtime and provides Nuxt/H3 integration.

## 1. Understand the core

1. [Overview](/en/reference/)
2. [Architecture](/en/reference/architecture)
3. [Module process](/en/reference/module)
4. [Embedded and remote modes](/en/guide/modes)

## 2. Build an application

1. [Quick start](/en/guide/getting-started)
2. [Feathers and Zod services](/en/guide/services)
3. [Frontend usage](/en/guide/frontend)
4. [Configuration](/en/reference/configuration)
5. [CLI reference](/en/reference/cli)

## 3. Secure access

- [Authentication](/en/reference/authentication)
- [Local JWT auth](/en/guide/auth-local)
- [Keycloak SSO](/en/guide/keycloak-sso)
- [Authentication events](/en/reference/events)

## 4. Validate the runtime

The [playground](/en/guide/playground) validates Feathers services, Zod schemas, authentication, MongoDB, REST, Socket.IO, Builder, and RBAC.

```bash
bunx nuxt-feathers-zod capabilities --section all --json
bunx nuxt-feathers-zod doctor
```

`capabilities` exposes what the installed version implements. `doctor` inspects the current project.

## 5. Operate and publish

- [Production](/en/guide/production)
- [Compatibility matrix](/en/guide/compatibility-matrix)
- [Known limits](/en/guide/known-limits)
- [Troubleshooting](/en/guide/troubleshooting)
- [Publishing](/en/guide/publishing)

## Repository sources of truth

| Surface | Source |
|---|---|
| Module capabilities | `src/runtime/capabilities.ts` |
| CLI commands and flags | `createCliCommand()` command tree |
| Nuxt/Feathers runtime | `src/module.ts`, `src/setup/`, `src/runtime/` |
| Validation workflows | `playground/app/composables/usePlaygroundNavigation.ts` |

The CLI reference is generated from the command tree. A repository coherence gate also checks module options, NFZ services, composables, events, and playground routes.

<!-- release-version: 6.5.49 -->
