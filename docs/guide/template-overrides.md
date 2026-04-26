---
editLink: false
---
# Overrides des templates

Les overrides permettent de surcharger certains templates générés sous `.nuxt/feathers/**` sans forker le module.

## Exemple : nouvelle app Nuxt 4 + overrides

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

## Activation

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

## À quoi ça sert

- personnaliser un plugin client généré
- ajuster la connexion remote
- surcharger un template serveur ciblé
- garder un runtime custom sans fork du module

## Recommandation de stabilité

Pour le core open source, les overrides doivent rester :

- optionnels,
- documentés,
- ciblés,
- faciles à désactiver.
