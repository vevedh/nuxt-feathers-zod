---
editLink: false
---
# Support policy

This page documents the supported and advanced feature perimeter, its configuration contract and the recommended usage pattern for application developers.

## Purpose

The supported and advanced feature perimeter helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure the supported and advanced feature perimeter;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    devtools: true,
    swagger: false,
    console: false,
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod doctor
bun run typecheck
bun run build
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

<!-- release-version: 6.5.41 -->
