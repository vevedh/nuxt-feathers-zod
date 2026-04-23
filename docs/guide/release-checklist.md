---
editLink: false
---
# Checklist de release

La checklist mainteneur officielle du module est aussi conservée à la racine du dépôt dans `RELEASE_CHECKLIST.md`.

Cette page publique résume la discipline minimale attendue avant publication.

## Contrôles publics à garder au vert

```bash
bun run build
bun run typecheck
bun run test:e2e
bun run smoke:tarball
```

## Contrôles packaging utiles

```bash
bun run sanity:package-exports
bun run sanity:cli-dist-meta
bun pm pack --dry-run
```

## Publication

Voir le guide dédié : [Publication npm & Git](./publishing)

## Voir aussi

- [Workflow communautaire](./community-workflow)
- [Flux de développement du dépôt](./repo-dev)
- [Politique de support](./support-policy.md)
