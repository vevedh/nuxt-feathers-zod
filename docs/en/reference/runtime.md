# Client API and composables

The module auto-imports composables from `src/runtime/composables` into the Nuxt application. The Feathers client remains the primary API for service operations.

## Feathers client

### `useFeathers()`

Returns the Feathers clients injected into Nuxt as `{ api, client, piniaClient }`. `api` is the main application client, `client` keeps access to the transport client, and `piniaClient` is always `null` as a destructuring compatibility field.

```ts
const { api } = useFeathers()
const users = api.service('users')
```

For business pages and composables, prefer `useService('users')` when the service path is known.

### `useService(path)`

Returns the typed Feathers service for a path.

```ts
const users = useService('users')
const result = await users.find({
  query: { $limit: 20 },
})
```

`useService()` returns a Feathers service. Call `find()`, `get()`, `create()`, `update()`, `patch()`, `remove()`, or a declared custom method directly.

### `useRawService(path)`

Provides direct access to the transport client service. Use it for native Feathers methods and events.

```ts
const messages = useRawService('messages')
messages.on('created', handleCreated)
```

## Authentication

### `useAuth()`

Provides the application-facing authentication API.

### `useAuthRuntime()`

Provides unified session, readiness, provider, and reauthentication state.

### `useAuthDiagnostics()`

Exposes diagnostics without displaying secrets.

### `useAuthTrace()`

Exposes recent events documented in [Events and lifecycle](/en/reference/events).

### `useAuthBoundFetch()`

Returns a request helper that waits for authentication state, binds the `Authorization` header, and can retry after a `401`.

### `useAuthBoundFetchImplementation()`

Lower-level variant of `useAuthBoundFetch()` that returns a native `Response`.

### `useAuthenticatedRequest()`

Provides the NFZ authenticated request abstraction.

### `useProtectedPage()`

Guards a page and stabilizes access state while the page mounts.

### `useProtectedService()` and `useProtectedTool()`

Protect service or internal-tool access.

## Builder and administration

### `useBuilderClient()`

Provides usage-oriented helpers for canonical NFZ Feathers services:

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

Calls use `client.service('nfz/...')`.

### `useMongoManagementClient()`

Client for MongoDB Management services configured through `database.mongo.management`.

### `useNfzAdminClient()`

Client for NFZ diagnostics and administration features exposed by the public configuration.

### `useKeycloakBridge()`

Client for the Keycloak bridge when `keycloak.mode` is `bridge`.

## Pinia

### `useNfzPinia()`

Returns the Pinia instance registered by `@pinia/nuxt` and an `available` boolean.

### `hasNfzPinia()`

Returns whether Pinia is available.

The module does not recreate a historical service-store wrapper. Pinia is reserved for explicit application and session stores.

## Design rule

For a business operation:

1. call a Feathers service through `useService()` or `useRawService()`;
2. use `useBuilderClient()` for NFZ Builder and RBAC services;
3. use HTTP request helpers only when the target contract is not a Feathers service.

<!-- release-version: 6.5.47 -->
