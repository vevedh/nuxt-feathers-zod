# Notes de publication — nuxt-feathers-zod 6.5.32

## Objet

La version `6.5.32` publie la migration proche vers `@vevedh/feathers-nitro@0.5.0` et durcit le processus de livraison npm.

## Changements runtime

- remplacement de `@gabortorma/feathers-nitro-adapter@0.6.0` ;
- imports générés remplacés par les exports publics :
  - `@vevedh/feathers-nitro/handlers` ;
  - `@vevedh/feathers-nitro/routers` ;
- conservation des chemins REST, Socket.IO, Express et Koa existants ;
- aucun basculement automatique vers le multi-instance ;
- alignement du moteur Node.js sur `^22.12.0 || ^24.11.0 || >=26.0.0`.

## Sécurisation de la publication

- contrôle de collision avec une version déjà présente sur npm ;
- contrôle strict entre le tag Git `vX.Y.Z` et `package.json` ;
- génération locale d'un tarball dans `release-artifacts/` ;
- publication de ce tarball exact, sans reconstruction entre validation et envoi au registre ;
- workflow GitHub Actions déclenché uniquement par un tag de version ;
- publication prévue via npm Trusted Publishing/OIDC avec provenance ;
- synchronisation de tous les marqueurs de version publics FR/EN ;
- correction de compatibilité entre la configuration ESLint et `eslint-plugin-vue` 9.33+.

## Compatibilité

La configuration historique reste compatible et mono-instance. Les fonctionnalités multi-instance fournies par `@vevedh/feathers-nitro` seront intégrées dans un patch distinct avec une configuration `feathers.instances[]` rétrocompatible et des tests d'isolation dédiés.

## Commandes de validation

```bash
bun install --frozen-lockfile
bun run release:check:registry
bun run release:check:full
bun run release:pack
```

## Publication

Tag attendu :

```text
v6.5.32
```

Le package ne doit être publié qu'après validation du tarball dans une application Nuxt 4 consommatrice.
