---
editLink: false
---
# Matrice de compatibilité

Cette matrice décrit le périmètre **visé et validé** pour le socle open source.

## Versions cibles

- **Bun** : 1.3.x
- **Nuxt** : 4.x
- **Nitro** : 2.x via Nuxt 4
- **Vue** : 3.5.x via Nuxt 4
- **FeathersJS** : v5 (Dove)
- **TypeScript** : 5.x

## Scénarios que le core doit continuer à supporter

| Scénario | Statut visé | Notes |
| --- | --- | --- |
| Nuxt 4 + embedded + memory | Stable | Point d’entrée recommandé |
| Nuxt 4 + embedded + MongoDB | Stable | Génération CLI recommandée |
| Nuxt 4 + embedded + auth locale/JWT | Stable | Service `users` via CLI |
| Nuxt 4 + remote REST | Stable | Services distants déclarés explicitement |
| Nuxt 4 + remote Socket.IO | Stable | Même logique de service déclaré |
| Keycloak SSO bridge | Stable avec configuration correcte | À valider dans un environnement réel |
| Swagger legacy | Stable optionnel | Dépend de `feathers-swagger` + `swagger-ui-dist` |

## Plateformes de validation prioritaires

- Windows 11 + Bun
- Linux + Bun

## Invariants à garder

- `servicesDirs: ['services']` comme convention publique recommandée
- CLI-first pour l’initialisation et la génération
- `memory` par défaut
- `--schema none` par défaut
- alias historiques supportés mais non mis en avant

## Commande de smoke test recommandée

```bash
bun install
bun run build
bun run docs:build
```
