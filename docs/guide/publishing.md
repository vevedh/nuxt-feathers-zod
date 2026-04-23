---
editLink: false
---
# Publication npm & Git

Cette page résume le parcours recommandé pour publier `nuxt-feathers-zod` côté **Git** puis côté **npm**.

## Objectif

Publier un package qui a été validé comme un vrai artefact consommateur, pas seulement comme un dépôt qui build en local.

## Vérifications minimales

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Vérifications packaging utiles

```bash
bun run sanity:package-exports
bun run sanity:cli-dist-meta
bun pm pack --dry-run
```

## Parcours recommandé

### 1. Préparer la version

- mettre à jour `package.json`
- mettre à jour `CHANGELOG.md`
- aligner `README.md`, `README_fr.md` et les guides publics concernés

### 2. Vérifier le dépôt

- pas de fichiers temporaires en racine
- docs FR/EN alignées
- `archives/` inchangé si aucun nouveau document historique n’est à archiver

### 3. Lancer la validation complète

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

### 4. Publier côté Git

Workflow recommandé :

```bash
git checkout -b release/vX.Y.Z
git add .
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
git push origin HEAD --tags
```

### 5. Publier côté npm

Après validation finale :

```bash
npm publish
```

> Adapte le tag dist (`latest`, `next`, etc.) selon ta stratégie de publication.

## À ne pas oublier

- les sous-chemins publics utilisés par les templates doivent rester exportés
- le CLI packé doit rester exécutable depuis le tarball
- le smoke tarball compte plus qu’un simple build local

## Voir aussi

- [Checklist de release](/guide/release-checklist)
- [Workflow communautaire](/guide/community-workflow)
- [Flux de développement du dépôt](/guide/repo-dev)
