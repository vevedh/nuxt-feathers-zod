---
editLink: false
---
# Swagger (legacy)

Le module supporte `feathers-swagger` en mode legacy.

## Exemple : nouvelle app Nuxt 4 + Swagger

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

## Activation manuelle

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    swagger: true
  }
})
```

## URLs usuelles

- UI : `http://localhost:3000/feathers/docs/`
- Spec : `http://localhost:3000/feathers/swagger.json`

## Point stable à conserver

Dans cette intégration, la spec est servie via `../swagger.json` depuis l’UI.
