---
editLink: false
---
# Publication npm et GitHub

Cette procédure publie une version validée de `nuxt-feathers-zod` sans exposer de jeton npm longue durée dans GitHub.

## Préparation initiale sur npm

Pour le package `nuxt-feathers-zod`, configure un **Trusted Publisher** GitHub Actions avec :

- dépôt : `vevedh/nuxt-feathers-zod` ;
- workflow : `.github/workflows/publish-npm.yml` ;
- environnement npm : laisse vide sauf si un environnement GitHub dédié est ajouté au workflow.

La relation OIDC doit être configurée avant de pousser le premier tag de publication.

## Contrôles disponibles

```bash
bun run release:check:registry
bun run release:check:full
bun run release:pack
```

La commande suivante exécute les contrôles, crée le tarball local et simule la publication :

```bash
bun run publish:npm:dry-run
```

## Préparer une version

1. incrémenter `package.json` ;
2. finaliser `CHANGELOG.md` ;
3. exécuter `bun run sync:release-meta` ;
4. mettre à jour `CHANGELOG.md`, `PATCHLOG.md` et les notes de version ;
5. vérifier que `bun run release:check:registry` confirme que la version est libre.

## Validation locale complète

```bash
bun install --frozen-lockfile
bun run release:prepare:publish
```

Le tarball est généré dans `release-artifacts/`. Il doit être testé comme dépendance d'une application Nuxt 4 avant création du tag. La commande de publication envoie cette archive validée exacte au lieu de reconstruire le package pendant la publication.

## Publication recommandée par tag

```bash
git checkout main
git pull --ff-only
git add .
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "nuxt-feathers-zod vX.Y.Z"
git push origin main
git push origin vX.Y.Z
```

Le workflow vérifie que le tag correspond exactement à `package.json`, contrôle que la version n'existe pas déjà sur npm, réinstalle le verrou Bun, exécute la validation complète, crée un tarball immuable puis publie cette archive exacte avec npm Trusted Publishing.

## Publication manuelle de secours

La publication locale reste disponible lorsqu'une session npm avec 2FA est active :

```bash
bun run publish:npm
```

Ne place jamais de jeton npm en clair dans `.npmrc`, `.env`, un script ou une archive.

## Invariants de publication

- `@vevedh/feathers-nitro@0.5.0` est le seul adaptateur Nitro autorisé ;
- le runtime généré reste mono-instance ;
- les exports publics `/handlers` et `/routers` sont utilisés ;
- Node.js doit respecter `^22.12.0 || ^24.11.0 || >=26.0.0` ;
- le tag de publication doit correspondre exactement à la version de `package.json`.

<!-- release-version: 6.5.49 -->
