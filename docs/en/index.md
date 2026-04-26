---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt 4"
  tagline: "A backend-first Nuxt module to embed Feathers inside Nitro or connect a typed Feathers client to a remote API, with a CLI-first workflow designed for real package publishing."
  image:
    light: /nuxt-feathers-zod/images/plume-light.svg
    dark: /nuxt-feathers-zod/images/plume-dark.svg
    alt: NFZ logo
  actions:
    - theme: brand
      text: Getting started
      link: /en/guide/getting-started
    - theme: alt
      text: CLI reference
      link: /en/reference/cli
    - theme: alt
      text: npm & Git publishing
      link: /en/guide/publishing

features:
  - title: "Two modes, one workflow"
    details: "Embedded when Feathers runs inside Nitro, remote when Nuxt consumes an external Feathers API."
  - title: "CLI-first"
    details: "Init, services, remote services, middleware and server modules are generated in a deterministic way."
  - title: "Optional Zod-first"
    details: "Use generated Zod schemas, query/data validation and shared types when you need them."
  - title: "Real authentication paths"
    details: "Local/JWT auth, Keycloak SSO compatibility and a dedicated client auth runtime."
  - title: "Packaging confidence"
    details: "Build, typecheck, E2E and tarball smoke checks are part of the public release discipline."
  - title: "Community-ready"
    details: "FR/EN docs, contribution workflow, release checklist and a cleaner public repository surface."
---

## Start here

Pick the path that matches your first goal:

- **Understand NFZ in 5 minutes** → [Getting started](/en/guide/getting-started)
- **Build an embedded Feathers backend inside Nuxt** → [Embedded / remote modes](/en/guide/modes)
- **Connect a Nuxt frontend to a remote Feathers API** → [Remote mode](/en/guide/remote)
- **Publish or maintain the OSS package** → [npm & Git publishing](/en/guide/publishing)

## What NFZ is really about

`nuxt-feathers-zod` is not just a client SDK.
It is a **Nuxt 4 + Feathers v5 foundation** for teams who want:

- an **embedded server** inside Nitro when a mono-repo full-stack app makes sense,
- a **remote client layer** when the API already exists elsewhere,
- a **CLI** that generates the important pieces instead of hand-wiring them,
- a path toward auth, Mongo management, diagnostics and builder tooling.

## Shortest supported path

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Golden rules

- Keep `feathers.servicesDirs = ['services']`.
- Generate services through the CLI.
- Do not hand-create your first service if you want to stay on the supported path.
- In remote mode, `feathers.templates.dirs` stays optional.

## Recommended guides

- [Getting started](/en/guide/getting-started)
- [Services (Zod-first)](/en/guide/services)
- [Local auth](/en/guide/auth-local)
- [Keycloak SSO](/en/guide/keycloak-sso)
- [File upload/download](/en/guide/file-upload-download)
- [Troubleshooting](/en/guide/troubleshooting)

## Release discipline

The public module is now aligned around four simple checks:

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

See also:

- [Community workflow](/en/guide/community-workflow)
- [Release checklist](/en/guide/release-checklist)
- [npm & Git publishing](/en/guide/publishing)
