---
editLink: false
---
# Template overrides

Overrides let you replace some templates generated under `.nuxt/feathers/**` without forking the module.

## Example: new Nuxt 4 app + overrides

```bash
bunx nuxi@latest init my-nfz-overrides
cd my-nfz-overrides
bun install
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod init templates --dir feathers/templates
bun dev
```

## Enable them

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    templates: {
      dirs: ['feathers/templates'],
      strict: true,
      allow: ['server/**/*.ts', 'client/**/*.ts', 'types/**/*.d.ts']
    }
  }
})
```

## What they are useful for

- customizing a generated client plugin
- adjusting remote connection behavior
- overriding a targeted server template
- keeping a custom runtime without forking the module

## Stability recommendation

For the open source core, overrides should remain:

- optional,
- documented,
- targeted,
- easy to disable.
