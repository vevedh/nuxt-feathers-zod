---
editLink: false
---
# Smoke scenarios

This page replaces the former navigation-only placeholder with a practical developer reference for minimal runtime validation scenarios. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

Minimal runtime validation scenarios helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure minimal runtime validation scenarios;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: false,
    },
    servicesDirs: ['services'],
    auth: false,
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod init embedded --framework express --force
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod --force
bunx nuxt-feathers-zod doctor
```

## Runtime example

```ts
const service = useService('messages')

const result = await service.find({
  query: {
    $limit: 10,
    $sort: { createdAt: -1 },
  },
})
```

## Practical advice

- Keep runtime-affecting options explicit in `nuxt.config.ts`.
- Prefer CLI-generated services so manifests and generated types stay synchronized.
- Run `bunx nuxt-feathers-zod doctor` after structural changes.
- Use `--dry` before write operations on an existing project.

<!-- release-version: 6.5.23 -->
