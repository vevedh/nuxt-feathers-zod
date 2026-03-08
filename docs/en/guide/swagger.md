---
editLink: false
---
# Swagger (legacy)

The module supports `feathers-swagger` in legacy mode.

## Example: new Nuxt 4 app + Swagger

```bash
bunx nuxi@latest init my-nfz-swagger
cd my-nfz-swagger
bun install
bun add nuxt-feathers-zod feathers-pinia feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --swagger
bunx nuxt-feathers-zod add service users --docs
bun dev
```

## Manual activation

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    swagger: true
  }
})
```

## Usual URLs

- UI: `http://localhost:3000/feathers/docs/`
- Spec: `http://localhost:3000/feathers/swagger.json`

## Stable point to preserve

In this integration, the spec is served via `../swagger.json` from the UI.
