---
editLink: false
---
# MongoDB management

This page replaces the former navigation-only placeholder with a practical developer reference for the MongoDB management administration surface. It explains the option, shows how to configure it in `nuxt.config.ts`, and gives a minimal usage example.

## Purpose

The mongodb management administration surface helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure the MongoDB management administration surface;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:changeMe@127.0.0.1:27037/app?authSource=admin',
        management: {
          enabled: true,
          basePath: '/mongo',
          auth: true,
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeCollectionCrud: true,
          allowInsertDocuments: false,
          allowPatchDocuments: false,
          allowRemoveDocuments: false,
        },
      },
    },
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod mongo management --basePath /mongo --auth true
```

## Runtime example

```txt
GET /mongo/databases
GET /mongo/:db/collections
GET /mongo/:db/:collection/documents
GET /mongo/:db/:collection/schema
```

## Practical advice

- Keep runtime-affecting options explicit in `nuxt.config.ts`.
- Prefer CLI-generated services so manifests and generated types stay synchronized.
- Run `bunx nuxt-feathers-zod doctor` after structural changes.
- Use `--dry` before write operations on an existing project.

<!-- release-version: 6.5.23 -->
