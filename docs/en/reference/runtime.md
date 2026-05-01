---
editLink: false
---
# Runtime API

This page replaces the former navigation-only placeholder with a practical developer reference for auto-imported runtime composables. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

Auto-imported runtime composables helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure auto-imported runtime composables;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    client: true,
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod add service messages --adapter memory --schema zod
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
