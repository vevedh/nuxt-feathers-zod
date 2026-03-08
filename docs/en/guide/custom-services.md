---
editLink: false
---
# Adapter-less services & custom methods

An **adapter-less service** is a Feathers service not backed by `memory`, MongoDB, or a classic CRUD adapter.

This is the right choice for:

- jobs,
- business actions,
- orchestration,
- file generation,
- preview operations,
- controlled endpoints.

## Example: new Nuxt 4 app + custom service

```bash
bunx nuxi@latest init my-nfz-actions
cd my-nfz-actions
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview --docs
bun dev
```

## Recommended command

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

## Generated structure

The generator usually creates:

- `actions.class.ts`
- `actions.ts`
- `actions.shared.ts`
- optionally `actions.schema.ts` depending on the generated mode

## Client-side usage example

```ts
const actions = useService('actions')

await actions.find()
await actions.run({ action: 'reindex', payload: { full: true } })
await actions.preview({ target: 'articles' })
```

## Why this mode matters

It keeps the open source core coherent for use cases that are **not** classic CRUD.

## Best practices

- keep custom methods explicit
- validate payloads
- avoid mixing too many responsibilities in one service
- document custom methods when `--docs` is used
