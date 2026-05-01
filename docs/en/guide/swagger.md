---
editLink: false
---
# Swagger legacy

This page replaces the former navigation-only placeholder with a practical developer reference for the legacy `swagger` option powered by `feathers-swagger`. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

The legacy `swagger` option powered by `feathers-swagger` helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure the legacy `swagger` option powered by `feathers-swagger`;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    swagger: {
      enabled: true,
      docsPath: '/docs',
      docsJsonPath: '/docs.json',
      openApiVersion: 3,
      info: {
        title: 'API NFZ',
        version: '1.0.0',
      },
    },
  }
})
```

## CLI example

```bash
bun add feathers-swagger swagger-ui-dist
bunx nuxt-feathers-zod init embedded --swagger true --force
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
