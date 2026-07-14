---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod for Nuxt 4"
  tagline: "A Feathers-first Nuxt module to run Feathers in Nitro or connect Nuxt to a remote API, with coherent CLI generation, Zod validation, and diagnostics."
  image:
    src: /images/nfz-feather.webp
    alt: nuxt-feathers-zod feather logo
  actions:
    - theme: brand
      text: Quick start
      link: /en/guide/getting-started
    - theme: alt
      text: Technical plan
      link: /en/guide/complete-guide
    - theme: alt
      text: Configuration
      link: /en/reference/configuration
    - theme: alt
      text: CLI reference
      link: /en/reference/cli

features:
  - title: "Feathers-first API"
    details: "Services, methods, hooks, and events stay in Feathers. Nitro hosts the runtime and Nuxt infrastructure."
  - title: "Embedded or remote"
    details: "Run Feathers in Nitro or connect the same client model to a remote Feathers API."
  - title: "Synchronized CLI"
    details: "Initialization, services, schemas, auth, MongoDB, templates, and modules are documented from the real command tree."
  - title: "Per-service schemas"
    details: "Choose Zod, JSON, or no schema according to each service contract and validation requirements."
  - title: "Authentication and SSO"
    details: "Local/JWT auth, session runtime, Keycloak client or bridge, and authentication diagnostics."
  - title: "NFZ services"
    details: "Builder, schemas, manifest, status, RBAC, presets, and initialization are Feathers services."
  - title: "Validation playground"
    details: "A validation center covers services, Zod, auth, MongoDB, REST, Socket.IO, Builder, and RBAC."
  - title: "Production and security"
    details: "Deterministic readiness, runtime secret resolution, idempotent teardown, and release gates."
  - title: "Checked reference"
    details: "Options, composables, events, services, CLI, and playground routes are checked against source code."
---

## Project

- [View the package on npm](https://www.npmjs.com/package/nuxt-feathers-zod)
- [Browse the GitHub repository](https://github.com/vevedh/nuxt-feathers-zod)

## Recommended path

1. [Understand the architecture](/en/reference/architecture).
2. [Install and start](/en/guide/getting-started).
3. [Configure the module](/en/reference/configuration).
4. [Create services](/en/guide/services).
5. [Use the client API](/en/reference/runtime).
6. [Validate with the playground](/en/guide/playground).
7. [Prepare production](/en/guide/production).

## Minimal example

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod
bunx nuxt-feathers-zod init embedded --auth
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
bunx nuxt-feathers-zod doctor
bun dev
```

## Inspect installed capabilities

```bash
bunx nuxt-feathers-zod capabilities --section all --json
```

The command exposes modes, transports, NFZ services, composables, and authentication events implemented by the installed package version.

<!-- release-version: 6.5.47 -->
