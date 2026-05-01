---
editLink: false
---
# Authentication

This page replaces the former navigation-only placeholder with a practical developer reference for Feathers local/JWT authentication. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

Feathers local/jwt authentication helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure Feathers local/JWT authentication;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    auth: {
      service: 'users',
      entity: 'user',
      entityClass: 'User',
      authStrategies: ['local', 'jwt'],
      local: {
        usernameField: 'email',
        passwordField: 'password',
      },
    },
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --schema zod --authAware true
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
