---
editLink: false
---
# Admin client

This page replaces the former navigation-only placeholder with a practical developer reference for the `admin-client` feature. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

The `admin-client` feature helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure the `admin-client` feature;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],
    client: true,
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
