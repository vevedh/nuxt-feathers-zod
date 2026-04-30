---
editLink: false
---
# CLI

> OSS reference snapshot: **v6.5.29**

The `nuxt-feathers-zod` CLI is the official interface for initializing projects, generating Feathers services, registering remote services, adding middleware, enabling MongoDB management and diagnosing an NFZ application.

## Usage

```bash
bunx nuxt-feathers-zod <command> [args] [--flags]
# alias
bunx nfz <command> [args] [--flags]
```

## Command surface aligned with the code

| Command | Purpose |
| --- | --- |
| `init embedded` | Initializes embedded Feathers inside Nuxt/Nitro. |
| `init remote` | Initializes remote client mode against an external Feathers API. |
| `init templates` | Copies overridable templates into `feathers/templates`. |
| `init starter` | Copies the main Nuxt 4 + Quasar 2 + UnoCSS + Pinia + MongoDB + auth/RBAC starter from `examples/nfz-quasar-unocss-pinia-starter`. |
| `remote auth keycloak` | Configures remote Keycloak payload mode. |
| `add service <name>` | Generates an embedded memory/mongodb service. |
| `add service <name> --custom` | Generates an adapter-less service with custom methods. |
| `add file-service <name>` | Generates a local upload/download service. |
| `add remote-service <name>` | Registers a client-side remote service. |
| `add middleware <name>` | Generates middleware or related artifacts. |
| `add server-module <name>` | Generates an advanced embedded server module. |
| `add mongodb-compose` | Generates `docker-compose-db.yaml` for MongoDB. |
| `mongo management` | Enables or updates MongoDB management routes. |
| `schema <service>` | Inspects, validates or repairs service schema state. |
| `auth service <name>` | Enables or disables JWT hooks on a service. |
| `doctor` | Diagnoses the project configuration. |

## Recommended examples

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod @pinia/nuxt pinia
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users --auth --schema zod
bun dev
```

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --auth true
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
```

## Quasar + UnoCSS + Pinia starter

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

This model is documented as the main starter in [Main Quasar + UnoCSS + Pinia starter](/en/guide/starter-quasar-unocss-pinia). It includes MongoDB, the `admin/admin123` seed, the `studioSession` store, global `session` middleware, the `useAdminFeathers()` facade and a `messages` business store inspired by the Feathers-Pinia pattern.

## RuntimeConfig contract

Read NFZ runtime metadata from:

```ts
const serverConfig = useRuntimeConfig()._feathers
const publicConfig = useRuntimeConfig().public._feathers
```

New code must not read `runtimeConfig.feathers` or `runtimeConfig.public.feathers`.

## Builder API runtime

The public Builder contract is:

- `GET /api/nfz/services`
- `GET /api/nfz/manifest`
- `POST /api/nfz/manifest`
- `GET /api/nfz/schema?service=<name>`
- `POST /api/nfz/schema`
- `POST /api/nfz/preview`
- `POST /api/nfz/apply`

Historical compatibility remains for `/api/nfz/schema/:service`.

<!-- release-version: 6.5.29 -->
