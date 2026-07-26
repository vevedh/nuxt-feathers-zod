---
editLink: false
---
# Template overrides

This page documents runtime template override directories, its configuration contract and the recommended usage pattern for application developers.

## Purpose

Runtime template override directories helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure runtime template override directories;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    templates: {
      dirs: ['feathers/templates'],
      strict: true,
      allow: [
        'server/**/*.ts',
        'server/*.mjs',
        'client/**/*.ts',
        'types/**/*.d.ts',
      ],
    },
  }
})
```

## Generated REST bridge format

The Express transport bridge is generated under the `server/rest-bridge.mjs` key. An override for this file must remain an ESM JavaScript module that Nitro can parse directly; keep `server/*.mjs` in the allow-list when replacing this bridge.

## CLI example

```bash
bunx nuxt-feathers-zod init templates --dir feathers/templates --force
bunx nuxt-feathers-zod templates list
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

<!-- release-version: 6.7.37 -->
