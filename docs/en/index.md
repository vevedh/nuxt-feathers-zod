---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt (Nitro)"
  tagline: "Two modes: embedded Feathers backend inside Nuxt (Nitro) OR a remote Feathers client. Zod-first generation, Pinia client, Swagger (legacy), and optional Keycloak SSO."
  image:
    src: https://vevedh.github.io/nuxt-feathers-zod/images/plume-dark.png
    alt: Feather logo
  actions:
    - theme: brand
      text: Quick start
      link: /en/guide/getting-started
    - theme: alt
      text: Configuration
      link: /en/reference/config

features:
  - title: "Backend inside Nitro"
    details: "Embedded mode: Feathers runs in the same runtime as Nuxt 4 (Nitro)."
  - title: "Remote (Socket.IO first)"
    details: "Remote mode: connect a Feathers client to an external backend. Socket.IO recommended, REST supported."
  - title: "Zod-first"
    details: "Generated Zod schemas, query/data validation, shared types (client/server)."
  - title: "Official CLI"
    details: "Generate services/middleware in a consistent way and avoid wiring mistakes."
  - title: "Transport-agnostic custom methods"
    details: "Safe pattern for custom methods (e.g. run) across REST/Socket, SSR-safe."
  - title: "Swagger (legacy)"
    details: "Optional docs UI with a validated setup for Nuxt/Nitro."
  - title: "Keycloak SSO"
    details: "Keycloak-only SSO pattern with SSR-safe initialization and whoami hydration."
---

## First create the Nuxt 4 app

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

## Quickstart

### Embedded

```bash
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

### Remote

```bash
bunx nuxt-feathers-zod init remote --url https://api.example --force
bun dev
```

### File upload/download

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

- Dedicated guide: [File upload/download service](/en/guide/file-upload-download)
- Main guide: [Getting started](/en/guide/getting-started)

## Notes

- For embedded services, set `feathers.servicesDirs = ['services']`.
- Always generate services via the CLI: `bunx nuxt-feathers-zod add service ...`.
- To enable remote mode: `bunx nuxt-feathers-zod init remote --url http://...` (Socket.IO by default, REST via `--transport rest`).
- In remote mode, `feathers.templates.dirs` is **optional** (only needed if you want to override client templates).

## Authentication (embedded + remote)

The module supports Feathers v5 (Dove) auth in **both modes**:

- **JWT** (`strategy: 'jwt'`) via `@feathersjs/authentication`
- **Local** (`strategy: 'local'`) via `@feathersjs/authentication-local`
- **OAuth** (`strategy: 'oauth'`) via `@feathersjs/authentication-oauth`
- **Keycloak SSO** remains an optional authentication mode

In **remote** mode, the module does **not** require local schemas (`services/**`) to boot. `entityImport` is **optional**.

## Secure defaults (embedded / Express)

In **embedded** mode, the REST server (Express) can enable a “secure defaults” preset:

- CORS (**ON** by default)
- compression
- helmet
- `json` + `urlencoded` body parsing
- optional static serving

```ts
export default defineNuxtConfig({
  feathers: {
    server: {
      secureDefaults: true,
      secure: {
        cors: true,
        helmet: true,
        compression: true,
        serveStatic: { path: '/', dir: 'public' } // or false
      }
    }
  }
})
```


## Product demos

- [Product demos](/en/guide/product-demos)

- [Builder Studio](/en/guide/builder-studio) — business presets, CLI parity, business starters and apply checklist


## Builder Studio 6.4.63

- optional barrels: `index.ts` inside the service directory, and optionally `services/index.ts`
- the `users` starter was aligned more closely with NFZ local-auth conventions (`passwordHash`, password masking in the external resolver)
- builder apply was aligned more closely with a CLI-first demonstration layout


## 6.4.64

- Builder Studio: `services/index.ts` can now be aggregated from multiple services marked `service+root`.
- Preview and apply use the full manifest list to produce a coherent root barrel across multiple services.


## 6.4.65
The **Services Manager** flow now separates **Builder demo** services, **scanned services** and **free drafts** more clearly so that quick tests are easier to understand inside the demo app.


## 6.4.66

- Builder Studio: dedicated **Presets** tab for official presets and business starters, improving visibility and quick access.


## 6.4.67

- Builder Studio: quick origin filter in the sidebar (`All`, `Demo`, `Scanned`, `Draft`).
- Builder Studio: local scrolling fixed for the `Presets` / `Starters` area.

## 6.4.69

- Services Manager now exposes three guided entry cards: quick tests, real services, and the advanced builder.
- The flow becomes easier to read before you even open Workflow / Presets / Workspace.

## 6.4.71 — License Center
- documentation for the License Center and reusable licensing / feature-gating components for future premium NFZ options

- [License Center](./guide/license-center)

- Builder client: `/en/guide/builder-client`

- [Repository development flow](./guide/repo-dev.md)
