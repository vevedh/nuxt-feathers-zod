---
editLink: false
---
# Checklist de publication

Cette checklist couvre les contrôles réellement exécutés pour une version de `nuxt-feathers-zod`.

## 1. Vérifier l’identité de la version

```bash
bun run release:check:registry
bun run release:tag:check -- vX.Y.Z
```

Le tag doit correspondre exactement à la version de `package.json`.

## 2. Vérifier l’arbre public

```bash
bun run sanity:public-repository
bun run sanity:source-hygiene
```

Le dépôt public doit contenir uniquement le code du module, les tests, les exemples, la documentation et les fichiers de publication utiles.

## 3. Valider le module

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run playground:build
bun run docs:build
bun run verify:sanity
```

`bun run test` exécute les suites unitaires, d’intégration et E2E isolées.

## 4. Construire le tarball exact

```bash
bun run release:pack
bun run sanity:package-exports
bun run sanity:cli-dist-meta
```

Le tarball validé se trouve dans `release-artifacts/`. La publication doit envoyer cette archive exacte, sans reconstruction intermédiaire.

## 5. Contrôler le playground

Avant le tag, vérifier au minimum :

- l’authentification locale ;
- les services Feathers REST et Socket.IO ;
- la découverte des services dans la Console Builder ;
- les diagnostics MongoDB lorsque MongoDB est activé ;
- les scénarios `embedded` et `remote` applicables à la version.

## 6. Contrôler la documentation

```bash
bun run docs:check-links
bun run docs:check-human-style
bun run docs:check-branding
```

Les guides FR/EN doivent décrire les mêmes contrats publics et les commandes CLI réellement disponibles.

## Publication

Voir [Publication npm & Git](./publishing).

<!-- release-version: 6.5.47 -->
