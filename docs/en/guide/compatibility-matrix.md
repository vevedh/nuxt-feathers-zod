---
editLink: false
---
# Compatibility matrix

This matrix describes the validated target perimeter of the open-source core.

## Target versions

- **Bun**: 1.3.x
- **Nuxt**: 4.x
- **Nitro**: 2.x through Nuxt 4
- **Vue**: 3.5.x through Nuxt 4
- **FeathersJS**: v5 (Dove)
- **TypeScript**: 5.x

## Supported core scenarios

| Scenario | Target status | Notes |
| --- | --- | --- |
| Nuxt 4 + embedded + memory | Stable | Recommended minimal entry point |
| Nuxt 4 + embedded + MongoDB | **NFZ certified** | Real Windows gate + isolated MongoDB starter validation |
| Nuxt 4 + embedded + PostgreSQL through Knex | **NFZ certified** | Real PostgreSQL gate against the exact npm artifact: CRUD/auth/query/index/schema/transaction/lifecycle |
| Nuxt 4 + embedded + MySQL/MariaDB through Knex | **NFZ certified** | Separate real MySQL 8.4 + MariaDB 11.8 gates against the exact tarball |
| Nuxt 4 + embedded + SQLite through Knex | **NFZ certified** | Real `better-sqlite3` file gate against the exact candidate: CRUD/auth/query/index/rollback/close-reopen |
| Nuxt 4 + embedded + MSSQL / SQL Server 2025 CU8 through Knex | **NFZ certified** | Real SQL Server 2025 CU8 gate against the exact candidate: CRUD/auth/query/schema/index/transaction/lifecycle |
| Several named MongoDB/SQL connections | **Certified cross-database matrix** | One registry exposes six certified engines; the candidate-bound coexistence gate runs MongoDB 7 + PostgreSQL 18 + file-backed SQLite simultaneously, with explicit provider-neutral limits |
| Nuxt 4 + embedded + local/JWT auth | Stable | Generate the `users` service through the CLI |
| Nuxt 4 + remote REST | Stable | Declare remote services explicitly |
| Nuxt 4 + remote Socket.IO | Stable | Uses the same declared-service model |
| Keycloak SSO bridge | Stable with correct configuration | Validate against the real identity environment |
| Legacy Swagger | Stable optional path | Requires `feathers-swagger` and `swagger-ui-dist` |

## Priority validation platforms

- Windows 11 + Bun
- Linux + Bun

## Preserved invariants

- `servicesDirs: ['services']` remains the recommended public convention;
- CLI-first initialization and service generation;
- `memory` remains the default adapter;
- `--schema none` remains the default schema mode;
- named connection diagnostics never expose credentials;
- legacy aliases remain supported but are not promoted as the primary architecture.

## Recommended smoke sequence

```bash
bun install
bun run sanity:templates
bun run sanity:syntax
bun run sanity:database-registry
bun run build
bun run docs:build
```

<!-- release-version: 6.8.0 -->
