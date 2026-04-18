# Builder client

Phase **6.4.111** introduces `useBuilderClient()` for **Builder Studio** surfaces.

## Goal

Like `useMongoManagementClient()`, this helper centralizes authenticated HTTP calls to internal builder routes through `useAuthBoundFetch()`.

## Canonical routes

The public runtime now exposes `runtimeConfig.public._feathers.builder` with canonical routes:

- `GET /api/nfz/services`
- `GET /api/nfz/manifest`
- `POST /api/nfz/manifest`
- `GET /api/nfz/schema?service=...`
- `POST /api/nfz/schema`
- `POST /api/nfz/preview`
- `POST /api/nfz/apply`

## Example

```ts
const builder = useBuilderClient()

const manifest = await builder.getManifest()
const services = await builder.getServices()
const preview = await builder.preview({ manifest })
```

## Contract

The module does not yet implement these endpoints on the server side.
This phase formalizes:

- public runtime metadata
- the auth-aware client helper
- the canonical Builder Studio route contract

The next phase aligns the playground validation surface with it.
