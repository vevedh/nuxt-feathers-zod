---
editLink: false
---
# RuntimeConfig

This page documents private and public `_feathers` runtime configuration, its configuration contract and the recommended usage pattern for application developers.

## Purpose

Private and public `_feathers` runtime configuration helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure private and public `_feathers` runtime configuration;
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
    console: {
      enabled: true,
      basePath: '/console',
      allowWrite: false,
    },
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod doctor
```

## Runtime example

```ts
const config = useRuntimeConfig()
const mode = config.public._feathers?.client?.mode

const { api } = useFeathers()
const messages = api.service('messages')
const result = await messages.find({ query: { $limit: 10 } })
```

## Practical advice

- Keep runtime-affecting options explicit in `nuxt.config.ts`.
- Prefer CLI-generated services so manifests and generated types stay synchronized.
- Run `bunx nuxt-feathers-zod doctor` after structural changes.
- Use `--dry` before write operations on an existing project.

<!-- release-version: 6.5.23 -->
