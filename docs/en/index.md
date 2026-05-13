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

## Minimal example

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

## Production path

Before publishing or deploying, run the project checks:

```bash
bun install
bun run docs:build
bun run typecheck
bun run build
bun run test
```

The critical points are covered in the [production checklist](/en/guide/production): secrets, transports, CORS, authentication, database configuration, service generation and documentation validation.
