---
editLink: false
---
# Recommended starter for real-world Nuxt 4 apps

The `nfz-quasar-unocss-pinia-starter` starter is the recommended starting point for building a business application with:

- Nuxt 4;
- Quasar 2;
- UnoCSS;
- Pinia;
- `nuxt-feathers-zod`;
- local auth;
- Feathers services;
- MongoDB;
- RBAC.

It shows the recommended conventions for:

- `nuxt.config.ts`;
- `nuxt-quasar-ui`;
- local/JWT auth;
- Pinia stores;
- middleware;
- layouts;
- admin dashboard;
- NFZ service access.

## When to start from the starter

Use the starter if you build:

- a member portal;
- an admin console;
- a business application;
- a dashboard;
- an application with RBAC;
- an app with MongoDB and business services.

## When direct installation is enough

You can install only `nuxt-feathers-zod` directly when you build:

- a minimal module;
- a simple remote client;
- an integration against an external Feathers API;
- a proof of concept without admin UI.

## Recommended command

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

## Why this starter matters

A real Nuxt 4 application needs more than a backend service. It needs a stable pattern for:

- Quasar SSR/hydration;
- layout and drawer behavior;
- login and session restore;
- RBAC middleware;
- admin-only services;
- Pinia as a UI cache;
- MongoDB-backed services;
- service generation and maintenance.

That is the integration contract the starter is meant to document.
