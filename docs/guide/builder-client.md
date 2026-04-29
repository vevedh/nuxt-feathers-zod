# Builder client

`useBuilderClient()` centralise les appels HTTP authentifiés vers les surfaces internes du **Builder Studio** via `useAuthBoundFetch()`.

## Objectif

Le helper évite de coder les routes `/api/nfz/**` en dur dans les dashboards Nuxt/NFZ Studio. Il lit les métadonnées publiques depuis `runtimeConfig.public._feathers.builder`, puis applique automatiquement le token courant grâce à `useAuthBoundFetch()`.

## Routes canoniques implémentées

Le runtime public expose `runtimeConfig.public._feathers.builder` avec les routes suivantes, désormais alignées avec les endpoints serveur :

- `GET /api/nfz/services`
- `GET /api/nfz/manifest`
- `POST /api/nfz/manifest`
- `GET /api/nfz/schema?service=...`
- `POST /api/nfz/schema`
- `POST /api/nfz/preview`
- `POST /api/nfz/apply`

Les routes historiques par service restent disponibles :

- `GET /api/nfz/schema/:service`
- `POST /api/nfz/schema/:service`

## Exemple

```ts
const builder = useBuilderClient()

const services = await builder.getServices()
const manifest = await builder.getManifest()

const preview = await builder.preview({
  service: 'messages',
  fields: {
    text: { type: 'string', required: true },
  },
})

const applied = await builder.apply({
  service: 'messages',
  fields: {
    text: { type: 'string', required: true },
  },
})
```

## Écriture protégée

Les opérations d’écriture (`POST /api/nfz/manifest`, `POST /api/nfz/schema`, `POST /api/nfz/apply`) vérifient `feathers.console.allowWrite` via le runtime serveur `_feathers.console` et les options Nuxt du projet consommateur.

Bonne pratique : garder `allowWrite: false` en production et l’activer uniquement en développement ou dans un environnement Studio explicitement protégé.
