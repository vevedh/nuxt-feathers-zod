# Patch 0.1.3 - Hydration / Quasar touch cleanup

## Objectif

Corriger les warnings observés après connexion sur les pages protégées du starter.

## Corrections

- `routeRules` `ssr:false` sur `/dashboard`, `/messages`, `/session` pour éviter le mismatch où le serveur rend un layout dashboard mais le client redirige vers le layout public.
- Désactivation globale de Quasar ripple via `quasar.config.ripple=false`.
- Suppression de `v-ripple` explicite sur les items du drawer.
- Ajout de `:ripple="false"` sur les actions principales.
- `useDrawerSafeState()` ne lit `$q.screen` qu'après `onMounted()`.

## Note

Le message Nuxt/Vue `<Suspense> is an experimental feature` reste un warning de développement Nuxt et n'indique pas une erreur applicative.
