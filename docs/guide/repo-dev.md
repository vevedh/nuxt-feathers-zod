---
editLink: false
---
# Flux de développement du dépôt

Cette page décrit le flux mainteneur recommandé pour faire évoluer `nuxt-feathers-zod` sans désynchroniser le code, le CLI et la documentation.

## Objectif

Chaque patch doit conserver le même contrat entre :

- le runtime Nuxt/Feathers généré ;
- les commandes CLI et les templates produits ;
- la documentation VitePress ;
- les scripts de validation et de packaging.

## Cycle de travail recommandé

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run playground:build
bun run docs:build
bun run verify:sanity
```

Pour un patch de release, mets aussi à jour :

- `package.json` ;
- `README.md` et `README_fr.md` ;
- `CHANGELOG.md` ;
- les notes de version publiques ;
- les pages VitePress impactées par le changement.

## Arbre public et notes locales

Le dépôt public contient le code du module, les tests, les exemples, la documentation et les fichiers de publication. Les notes de maintenance locales restent hors de l’arbre suivi par Git.

Avant un commit ou une publication :

```bash
bun run sanity:public-repository
```

Ce contrôle refuse les dossiers de suivi local et les rapports internes dans l’arbre public.

## Règles de cohérence

### RuntimeConfig

Le contrat runtime officiel utilise :

```ts
runtimeConfig._feathers
runtimeConfig.public._feathers
```

Les anciens chemins `runtimeConfig.feathers` et `runtimeConfig.public.feathers` ne doivent plus être introduits dans le code généré.

### Client navigateur

Les fichiers runtime servis au navigateur doivent éviter les imports ESM/CJS fragiles depuis `@feathersjs/*` et `feathers-pinia`.

Le contrat standard reste :

- client Feathers natif exposé via `$api`, `$client`, `$feathersClient` ;
- Pinia utilisé pour la session applicative ;
- `feathers-pinia` optionnel, non requis pour l'auth runtime standard.

### Documentation

Avant publication, `bun run docs:build` doit passer sans lien mort. Les liens internes doivent pointer vers des pages réellement présentes dans `docs/`.

## Voir aussi

- [Publication npm & Git](./publishing)
- [Checklist de release](./release-checklist)
- [Workflow communautaire](./community-workflow)
- [Référence CLI](/reference/cli)

<!-- release-version: 6.5.47 -->

## Nettoyer un ancien index Git

Après une migration depuis une ancienne version du dépôt, des fichiers de maintenance peuvent rester suivis même s'ils sont désormais présents dans `.gitignore`. Le garde `sanity:public-repository` les refuse volontairement.

Exécutez :

```bash
bun run repo:clean-maintenance-index
git status --short
```

La commande retire uniquement les chemins de maintenance de l'index Git avec `git rm --cached`. Les fichiers locaux restent sur le disque et demeurent ignorés par Git.
