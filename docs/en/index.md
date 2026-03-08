---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod + Nuxt 4 (Nitro)"
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

## Quickstart

### Embedded (local Feathers server)

```bash
bunx nuxt-feathers-zod init embedded --force
bun dev
```

### Remote (Socket.IO first)

```bash
bunx nuxt-feathers-zod init remote --url https://api.example --force
bun dev
```

::: tip Remote mode
In **remote mode**, NFZ behaves as a **Feathers client** (REST or Socket.IO). It does not scan local services and does not require an embedded `users`/`authentication` service.
:::

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
