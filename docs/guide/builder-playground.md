# Playground Builder validation

La phase **6.4.112** ajoute une vraie page playground **`/builder`** alignée sur le contrat runtime du module.

## Objectif

Valider que la surface Builder Studio côté application consommatrice n'utilise plus des appels HTTP bruts, mais le même chemin auth/transport que les autres outils internes :

- `useProtectedPage()`
- `useBuilderClient()`
- `useAuthBoundFetch()` en sous-couche

## Page de validation

La page playground **`/builder`** :

- lit les métadonnées publiques du builder depuis `runtimeConfig.public._feathers.builder`
- protège la surface avec `useProtectedPage()`
- consomme les routes builder via `useBuilderClient()`
- affiche un résultat JSON lisible pour les appels :
  - services
  - manifest
  - schema
  - preview

## Pourquoi c'est important

Cette page sert de surface de validation pour s'assurer que :

- le builder suit le même contrat auth/runtime que Mongo management
- les apps consommatrices n'appellent pas directement `/api/nfz/*`
- les routes builder sont découvertes via le runtime public, pas codées en dur partout

## Flux recommandé

```ts
const page = useProtectedPage({ auth: 'required', reason: 'playground-builder' })
const builder = useBuilderClient()

await page.ensure()
const services = await builder.getServices()
```

## Portée de la phase

Cette phase valide la **surface cliente** et la **page playground**.
Les endpoints serveur du builder restent à la charge de l'application qui expose réellement ces routes.
