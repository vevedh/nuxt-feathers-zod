# Architecture

The module supports two execution modes.

## Embedded Mode

Feathers runs inside Nuxt Nitro.

Nuxt
 └─ Nitro
     └─ Feathers App
         ├─ services
         ├─ hooks
         └─ transports

Routes:

/feathers/<service>

Example:

GET /feathers/users

---

## Remote Mode

Nuxt
 └─ Feathers client
      └─ Remote API

Example:

bunx nuxt-feathers-zod init remote --url https://api.example.com

## MongoDB infrastructure (embedded)

When `feathers.database.mongo.url` is present, MongoDB is initialized as infrastructure before services, following a Feathers Dove style order:

1. create app
2. authentication (if enabled)
3. mongodb
4. services
5. scanned plugins
6. server modules
7. app.setup()

MongoDB is not treated as an optional scanned business plugin anymore. The generated runtime configures it explicitly via `app.configure(mongodb)` and exposes:

- `app.get('mongodb')` for the connection string
- `app.get('mongoPath')` for management base path
- `app.get('mongodbClient')` as `Promise<Db>` for compatibility
- `app.get('mongodbDb')` as `Db`
- `app.get('mongodbConnection')` as `MongoClient`
## FIX60
- Async Mongo initialization is now considered infrastructure orchestration, not a generic Feathers plugin hook.
- Playground fallback to memory after URL probe is a DX concern and must stay outside the generic module runtime.

## Schema architecture (manifest-first)
- Service schema state must be persisted in manifests under `services/.nfz/**`.
- `schema <service>` reads from manifest first, then infers from code when no manifest exists yet.
- `--set-mode` rewrites generated service/schema files from manifest state.
- This manifest-first model is the base for later builder/console/CLI convergence.


## Patch 2 implementation note
Field mutations must not patch generated TS files directly. They mutate manifest state first, then call the same regeneration path used by schema mode changes.


## Patch 3 implementation note
Manifest-first schema mutations must support a preview phase. `--diff` should operate on the manifest model before file regeneration so the same logic can later be reused by the builder UI.

## Patch 4 implementation note
Auth compatibility checks are manifest-first and intentionally conservative.
For auth-enabled `users`, the current valid baseline is:
- schema mode `zod`
- required field `userId:string`
- required field `password:string`

`--repair-auth` is a restorative operation: it updates manifest state first, then re-renders service artifacts from that repaired manifest.

## Auth-aware service generation
`users` with `auth=true` is a special-case generator path.
Manifest/schema compatibility alone is not enough.
Runtime-compatible generation must include password hashing and password redaction.
