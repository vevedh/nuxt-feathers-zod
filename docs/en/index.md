---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt 4"
  tagline: "A backend-first Nuxt module to embed Feathers inside Nitro or connect a typed Feathers client to a remote API, with a CLI-first workflow designed for real package publishing and production deployment."
  image:
    src: /images/plume-dark.png
    alt: nuxt-feathers-zod feather logo
  actions:
    - theme: brand
      text: Getting started
      link: /en/guide/getting-started
    - theme: alt
      text: Main starter
      link: /en/guide/starter-quasar-unocss-pinia
    - theme: alt
      text: Production
      link: /en/guide/production
    - theme: alt
      text: CLI reference
      link: /en/reference/cli

features:
  - title: "Nuxt 4 + Feathers v5"
    details: "A full-stack foundation to expose Feathers services inside Nitro or consume an existing remote Feathers API."
  - title: "Two controlled modes"
    details: "Embedded for backend-first monorepos, remote for Nuxt applications connected to an external Feathers backend."
  - title: "CLI-first"
    details: "Initialization, services, auth, remote services, middleware, MongoDB and templates are generated in a deterministic way."
  - title: "Optional Zod-first"
<<<<<<< HEAD
    details: "Use Zod schemas, JSON Schema or no schema depending on the maturity and criticality of each service."
  - title: "Auth and SSO"
    details: "Local/JWT auth, client runtime, Pinia stores, Keycloak SSO and LDAP/AD bridge compatibility for remote architectures."
  - title: "MongoDB and admin tooling"
    details: "Embedded MongoDB setup, management routes, console/builder, DevTools and diagnostics for faster development."
  - title: "Production-ready"
    details: "Configuration guides, runtimeConfig, release checks, secret management, transports and deployment guidance."
  - title: "Clear runtime API"
    details: "Composables, Feathers client, auth runtime, typed services and documented events for Nuxt applications."
  - title: "Developer documentation"
    details: "Guides, options reference, complete CLI reference, events/hooks, best practices and troubleshooting."
=======
    details: "Use generated Zod schemas, query/data validation and shared types when you need them."
  - title: "Main Quasar starter"
    details: "Nuxt 4 + Quasar 2 + UnoCSS + Pinia + MongoDB model with local auth, session middleware, RBAC and a Feathers facade."
  - title: "Real-world business app"
    details: "A complete guide for integrating NFZ into a business portal with layouts, auth, RBAC, Pinia stores and MongoDB services."
  - title: "Real authentication paths"
    details: "Local/JWT auth, Keycloak SSO compatibility and a dedicated client auth runtime."
  - title: "Packaging confidence"
    details: "Build, typecheck, E2E and tarball smoke checks are part of the public release discipline."
  - title: "Community-ready"
    details: "FR/EN docs, contribution workflow, release checklist and a cleaner public repository surface."
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
---

## Start here

- **Understand the architecture** → [Embedded / remote modes](/en/guide/modes)
- **Start in a few minutes** → [Getting started](/en/guide/getting-started)
- **Prepare production deployment** → [Production checklist](/en/guide/production)
- **Build a real Nuxt 4 + Quasar business app** → [Real-world integration guide](/en/guide/real-world-nuxt4-quasar-app)
- **Choose the right mode** → [Embedded / remote modes](/en/guide/modes)
- **Generate services** → [Services](/en/guide/services)
- **Configure all options** → [Configuration reference](/en/reference/configuration)
- **Understand the runtime** → [Runtime API](/en/reference/runtime)
- **Trace events and hooks** → [Events and hooks](/en/reference/events)
- **Remote Keycloak + LDAP/AD bridge** → [Keycloak LDAP SPA guide](/en/guide/remote-keycloak-ldap)
- **SSR Keycloak + LDAP/AD variant** → [Keycloak LDAP SSR guide](/en/guide/remote-keycloak-ldap-ssr)
- **Use the CLI** → [CLI reference](/en/reference/cli)

<<<<<<< HEAD
## Minimal example
=======
- **Understand NFZ in 5 minutes** → [Getting started](/en/guide/getting-started)
- **Start a complete business dashboard** → [Main Quasar + UnoCSS + Pinia starter](/en/guide/starter-quasar-unocss-pinia)
- **Integrate NFZ into a real business app** → [Real-world Nuxt 4 + Quasar app](/en/guide/real-world-nuxt4-quasar-app)
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
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
bun dev
```

## Positioning

`nuxt-feathers-zod` is not only a client SDK. It is a Nuxt 4 module for structuring a Feathers backend, generating repetitive artifacts, exposing REST/Socket.IO transports and keeping configuration aligned with source code.

The recommended path is straightforward: initialize through the CLI, generate services, enable Zod for durable contracts, centralize client access and protect all administration surfaces.

<<<<<<< HEAD
## Production path
=======
- [Getting started](/en/guide/getting-started)
- [Main Quasar + UnoCSS + Pinia starter](/en/guide/starter-quasar-unocss-pinia)
- [Real-world Nuxt 4 + Quasar app](/en/guide/real-world-nuxt4-quasar-app)
- [Services (Zod-first)](/en/guide/services)
- [Local auth](/en/guide/auth-local)
- [Keycloak SSO](/en/guide/keycloak-sso)
- [File upload/download](/en/guide/file-upload-download)
- [Troubleshooting](/en/guide/troubleshooting)
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb

Before publishing or deploying, run the project checks:

```bash
bun install
bun run docs:build
bun run typecheck
bun run build
bun run test
```

The critical points are covered in the [production checklist](/en/guide/production): secrets, transports, CORS, authentication, database configuration, service generation and documentation validation.
