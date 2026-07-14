# Client API and composables

The module auto-imports composables from `src/runtime/composables` into the Nuxt application. The Feathers client remains the primary API for services.

## Feathers client

### `useFeathers()`

Returns the Feathers client injected into Nuxt.

### `useService(path)`

Returns a Feathers service for a path.

### `useRawService(path)`

Provides direct access to native Feathers methods and events.

## Authentication

- `useAuth()` provides the application-facing authentication API.
- `useAuthRuntime()` provides unified session, readiness, provider, and reauthentication state.
- `useAuthDiagnostics()` exposes safe diagnostics.
- `useAuthTrace()` exposes recent authentication events.
- `useAuthBoundFetch()` returns a request helper that binds the current authorization state.
- `useAuthBoundFetchImplementation()` is the lower-level variant that returns a native `Response`.
- `useAuthenticatedRequest()` provides the NFZ authenticated request abstraction.
- `useProtectedPage()` guards a page and stabilizes access state while mounting.
- `useProtectedService()` protects service access.
- `useProtectedTool()` protects an internal tool.

## Builder and administration

### `useBuilderClient()`

Uses the canonical Feathers NFZ services:

```ts
const builder = useBuilderClient()

await builder.getServices()
await builder.getSchema('users')
await builder.getManifest()
await builder.preview({ service: 'users', fields: {} })
await builder.getStatus()
await builder.getRbac()
await builder.getPresets()
```

### `useMongoManagementClient()`

Accesses MongoDB Management services configured under `database.mongo.management`.

### `useNfzAdminClient()`

Accesses NFZ administration and diagnostics exposed by the public configuration.

### `useKeycloakBridge()`

Accesses the Keycloak bridge when `keycloak.mode` is `bridge`.

## Pinia

### `useNfzPinia()`

Returns the Pinia instance registered by `@pinia/nuxt` and an `available` state.

### `hasNfzPinia()`

Returns whether Pinia is available.

The module does not restore the legacy service-store wrapper. Pinia is intended for explicit application and session stores.

## Design rule

For business operations, call a Feathers service through `useService()` or `useRawService()`. Use `useBuilderClient()` for NFZ Builder and RBAC services. HTTP request helpers are reserved for contracts that are not Feathers services.

<!-- release-version: 6.5.41 -->
