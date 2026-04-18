# Builder client

La phase **6.4.111** introduit `useBuilderClient()` pour le **Builder Studio**.

## Objectif

Comme `useMongoManagementClient()`, ce helper centralise les appels HTTP authifiés vers les surfaces internes du builder via `useAuthBoundFetch()`.

## Routes formalisées

Le runtime public expose désormais `runtimeConfig.public._feathers.builder` avec des routes canoniques :

- `GET /api/nfz/services`
- `GET /api/nfz/manifest`
- `POST /api/nfz/manifest`
- `GET /api/nfz/schema?service=...`
- `POST /api/nfz/schema`
- `POST /api/nfz/preview`
- `POST /api/nfz/apply`

## Exemple

```ts
const builder = useBuilderClient()

const manifest = await builder.getManifest()
const services = await builder.getServices()
const preview = await builder.preview({ manifest })
```

## Contrat

Le module n'implémente pas encore ces endpoints côté serveur.
Cette phase formalise :

- les métadonnées publiques
- le helper client auth-aware
- le contrat de routes du Builder Studio

La phase suivante aligne la surface de validation playground dessus.
