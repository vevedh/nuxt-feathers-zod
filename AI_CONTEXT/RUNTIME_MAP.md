# Runtime Map

The module generates runtime code in:

.nuxt/feathers

Structure:

client/
server/

Runtime injections:

$api  
$client  
$feathersClient  
$piniaClient

## PATCH 12 - Socket.IO auth payload alignment
- unified remote auth payload construction via runtime helper `buildRemoteAuthPayload`
- normalized access token extraction via `getAccessTokenFromResult`
- remote auth startup/reconnect now explicitly re-authenticates on Socket.IO when a token is available
- remote auth defaults now include `storageKey` and keycloak payload defaults to `access_token`
- client connection now exposes raw socket on `$api.get('socket')` for reconnect hooks


## FIX57 - MongoDB infrastructure refactor
- MongoDB embedded runtime moved from optional plugin-like loading to explicit infrastructure initialization.
- `createFeathersApp()` now works together with `configureFeathersInfrastructure()` to initialize auth and Mongo before services.
- Generated `.nuxt/feathers/server/mongodb.ts` exports a Feathers-compatible `mongodb` configure function and uses `feathers-mongodb-management-ts`.
- Runtime still preserves `mongodbClient = Promise.resolve(db)` for existing generated Mongo service classes.

## FIX58b
- Toolchain stability rule: root scripts use local `nuxi`/`vitepress` binaries.
- Mongo management runtime continues to target `feathers-mongodb-management-ts`, pinned to npm `2.1.0` for reproducible installs.

## FIX59 - Playground Mongo mode detection
- Public runtime config now exposes `nfzPlayground.embeddedMongoMode` with values `disabled | memory | url`.
- `playground/nuxt.config.ts` only starts `MongoMemoryServer` when the effective mode is `memory`.
- `embedded + mongodb + url` uses the external connection string directly and must not spawn an in-memory server.
## FIX60 — awaited Mongo infrastructure
- The generated embedded runtime now treats Mongo initialization as an awaited infrastructure step, not a best-effort Feathers configure callback.
- Correct order is:
  1. create app
  2. auth
  3. `await mongodb(app)`
  4. services
  5. scanned plugins
  6. server modules
  7. `app.setup()`
- Playground may still choose the effective Mongo URL from either an external server or a `mongodb-memory-server` fallback before runtime generation.

## FIX60b
- Fixed generated server plugin quoting in `src/runtime/templates/server/plugin.ts` so `.nuxt/feathers/server/plugin.ts` parses correctly when logging missing `mongodbClient`.

## FIX61 / Patch 1 — CLI schema runtime mapping
- CLI schema inspection does not change runtime behavior by itself.
- `--set-mode` changes generated service artifacts so runtime validation aligns with the selected mode:
  - `none` => no generated schema file + hooks without schema validators
  - `zod` => generated Zod schema + schema hooks/resolvers
  - `json` => generated JSON schema variant + schema hooks/resolvers


## Patch 2 runtime impact
Changing fields in manifest immediately affects generated schema artifacts for modes `zod` and `json`. In `none` mode, field metadata is still preserved in manifest for later reactivation of schema validation.


## PATCH63 / Patch 3 runtime note
JSON schema generation now emits query schemas via `querySyntax(queryProperties, ...)` instead of spreading the full data schema into AJV query compilation. This avoids invalid `$id` handling during JSON-mode service generation.

## Patch 4 runtime note
Schema validation helpers are CLI-side safety tools.
They do not change runtime boot flow directly, but they prevent runtime/auth breakage by restoring a valid `users --auth` manifest before regeneration.

## Local auth runtime compatibility
For `users --auth`, runtime compatibility requires generated schema resolvers:
- `passwordHash({ strategy: 'local' })` for create/patch
- external resolver returns `undefined` for password
Without these, local login can fail with `NotAuthenticated: Invalid login` even when the manifest looks valid.
