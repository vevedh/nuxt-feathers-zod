---
editLink: false
---
# Local auth

This page documents the `auth-local` feature, its configuration contract and the recommended usage pattern for application developers.

## Purpose

The `auth-local` feature helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure the `auth-local` feature;
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
const service = useService('messages')

const result = await service.find({
  query: {
    $limit: 10,
    $sort: { createdAt: -1 },
  },
})
```


## Portable authentication entity identifiers

NFZ does not force the authentication entity identifier to be a MongoDB ObjectId. The local strategy preserves primitive identifiers used by SQL or Memory services, including integers, UUIDs, strings, and decimal-string bigints. Only BSON `ObjectId` values that may originate from another MongoDB driver copy are normalized to hexadecimal strings before the external entity re-read.

The normalization performs no implicit numeric conversion and does not weaken the target adapter's validation. The `users` service `idStrategy` must therefore match the schema and storage contract used by the application.

## Practical advice

- Keep runtime-affecting options explicit in `nuxt.config.ts`.
- Prefer CLI-generated services so manifests and generated types stay synchronized.
- Run `bunx nuxt-feathers-zod doctor` after structural changes.
- Use `--dry` before write operations on an existing project.

<!-- release-version: 6.8.0 -->
