---
layout: home

hero:
  name: "nuxt-feathers-zod"
  text: "FeathersJS v5 + Zod + Nuxt 4 (Nitro)"
  tagline: "A Feathers backend embedded in Nuxt, Zod-first service generation, Pinia client, Swagger (legacy), and optional Keycloak SSO."
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
    details: "Feathers runs in the same runtime as Nuxt 4 — no separate backend needed."
  - title: "Zod-first"
    details: "Generated Zod schemas, query/data validation, shared types (client/server)."
  - title: "Official CLI"
    details: "Generate services/middleware in a consistent way and avoid wiring mistakes."
  - title: "Transport-agnostic custom methods"
    details: "Safe pattern for RPC-like methods (e.g. run) across REST/Socket, SSR-safe."
  - title: "Swagger (legacy)"
    details: "Optional docs UI with a validated setup for Nuxt/Nitro."
  - title: "Keycloak SSO"
    details: "Keycloak-only SSO pattern with SSR-safe initialization and whoami hydration."
---
