# Checklist de release

Cette checklist fige le processus minimal de publication open source de `nuxt-feathers-zod`.

## Avant la release

- vérifier que `PATCHLOG.md` et `PROMPT_CONTEXT.md` sont à jour
- vérifier que le `README.md` reflète les fonctionnalités réellement stables
- incrémenter la version du package au bon niveau (`patch`, `minor`, `major`)
- s'assurer que les pages internes de documentation ne font pas partie du build public de production

## Vérifications locales

```bash
bun install
bun run lint
bun run sanity:templates
bun run prepare
bun run build
bun run docs:build
```

## Vérifications fonctionnelles recommandées

- embedded minimal
- embedded + auth locale + swagger
- remote REST
- remote Socket.IO
- génération d'un service sans adapter avec méthodes custom
- build de la documentation VitePress

## Publication npm manuelle

```bash
npm login
npm whoami
npm pack --dry-run
npm version patch
npm publish --access public
```

## Publication beta

```bash
npm version prerelease --preid beta
npm publish --tag beta --access public
```

## Après publication

- pousser le commit et les tags Git
- vérifier la version publiée sur npm
- vérifier que la documentation publique correspond bien à la version publiée
