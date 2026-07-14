---
editLink: false
---
# Services sans adapter & méthodes custom

Un **service sans adapter** est un service Feathers qui n’est pas adossé à `memory`, MongoDB ou un autre adapter CRUD classique.

C’est le bon choix pour :

- jobs,
- actions métier,
- orchestration,
- génération de fichiers,
- opérations de preview,
- endpoints contrôlés.

## Exemple : nouvelle app Nuxt 4 + service custom

```bash
bunx nuxi@latest init my-nfz-actions
cd my-nfz-actions
bun install
bun add nuxt-feathers-zod
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview --docs
bun dev
```

## Commande recommandée

```bash
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
```

## Structure générée

Le générateur crée généralement :

- `actions.class.ts`
- `actions.ts`
- `actions.shared.ts`
- éventuellement `actions.schema.ts` selon le mode généré

## Exemple d’usage côté client

```ts
const actions = useService('actions')

await actions.find()
await actions.run({ action: 'reindex', payload: { full: true } })
await actions.preview({ target: 'articles' })
```

## Pourquoi ce mode est important

Il permet de garder le core open source cohérent pour tous les cas qui ne sont **pas** du CRUD classique.

## Bonnes pratiques

- garder des méthodes custom explicites
- valider les payloads
- ne pas mélanger trop de responsabilités dans un même service
- documenter les méthodes custom quand `--docs` est utilisé
