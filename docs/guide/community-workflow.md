---
editLink: false
---
# Workflow communautaire

Cette page résume la discipline publique du dépôt `nuxt-feathers-zod`.

## Objectif

Garder le dépôt centré sur :

- le code du module
- la documentation publique
- les tests et smoke tests
- l’outillage de release

Les notes historiques ou internes sont déplacées dans `archives/`.

## Vérifications recommandées

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Fichiers racine importants

- `README.md`
- `README_fr.md`
- `CONTRIBUTING.md`
- `RELEASE_CHECKLIST.md`
- `REPO_DEV.md`

## Pourquoi `test:e2e` et `smoke:tarball` comptent

- `test:e2e` protège les parcours embedded les plus importants
- `smoke:tarball` protège le package publié tel qu’un consommateur réel le verra

## Pour un nouveau contributeur

Ordre de lecture recommandé :

1. `README.md`
2. [Démarrage rapide](/guide/getting-started)
3. [Workflow communautaire](/guide/community-workflow)
4. [Checklist de release](/guide/release-checklist)
5. [Publication npm & Git](/guide/publishing)
