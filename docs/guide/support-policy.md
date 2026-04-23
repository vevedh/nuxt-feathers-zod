---
editLink: false
---
# Politique de support

## Ce qui est supporté en priorité

Le socle prioritaire couvre :

- Nuxt 4
- Bun
- embedded / remote
- REST / Socket.IO
- Express / Koa
- auth locale / JWT
- bridge Keycloak SSO
- génération CLI
- MongoDB management en mode opt-in
- packaging npm avec sous-chemins exports validés

## Parcours à protéger en premier

Quand une régression apparaît, les parcours à protéger en priorité sont :

1. nouvelle app Nuxt 4 + `init embedded`
2. embedded + auth locale
3. remote REST
4. remote Socket.IO
5. `bunx nuxt-feathers-zod --help`
6. `bun run test:e2e`
7. `bun run smoke:tarball`

## Politique de correction

Une correction core doit privilégier :

- compatibilité arrière quand c’est raisonnable
- exemple minimal mis à jour
- docs FR/EN alignées
- validation réelle via build, typecheck, E2E ou tarball smoke selon le périmètre

## Hygiène du dépôt

Le root du dépôt doit rester centré sur le module public. Les notes historiques de maintenance sont déplacées dans `archives/`.
