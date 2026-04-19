
> 6.4.130 note: `ensureReady()` remains the owner of bootstrap readiness, while `reAuthenticate()` no longer forces `ready` directly.
---
editLink: false
---
# Unified auth runtime

Since `6.4.92+`, `nuxt-feathers-zod` provides a unified client auth runtime to reduce drift between:

- `$api`
- the raw Feathers client
- the Pinia auth store
- cookie / localStorage
- Keycloak SSO
- protected runtime tools

## Goal

Avoid cases where:

- login looks successful
- the bearer token exists somewhere
- but another protected page still runs without a usable session

## Source of truth: `useAuthRuntime()`

```ts
const auth = useAuthRuntime()
await auth.ensureReady()

console.log(auth.status.value)
console.log(auth.accessToken.value)
console.log(auth.user.value)
```


## Embedded local auth: stop guessing field names

For custom login UIs in embedded mode, do not assume the backend always expects `email/password`.

The public runtime now exposes the resolved local config:

```ts
const pub = useRuntimeConfig().public
console.log(pub._feathers.auth.local)
```

And `buildLocalAuthPayload()` builds the correct payload:

```ts
import { buildLocalAuthPayload } from 'nuxt-feathers-zod/auth-utils'

const auth = useRuntimeConfig().public._feathers.auth
const payload = buildLocalAuthPayload(login.value, password.value, auth?.local)
await useAuthRuntime().authenticate(payload)
```

This now works reliably because NFZ also applies that same resolved auth config on the server through `app.set('authentication', config)` before creating `AuthenticationService`.

## Protected HTTP routes

```ts
const request = useAuthenticatedRequest()
const diagnostics = await request('/api/diagnostics/runtime')
```

## Protected services

```ts
const users = useProtectedService('users')
const rows = await users.find({ query: { $limit: 10 } })
```

## Phase 3 — official auth-bound transport

- `useAuthBoundFetch()` for protected routes
- `useAuthenticatedRequest()` now delegates to `useAuthBoundFetch()`
- `useProtectedService()` retries once after `reAuthenticate()` on 401
- generated REST clients reuse the same bearer source

## Phase 4 — official protected tools

- `useProtectedTool(basePath)`
- `useMongoManagementClient()`

Goal: stop rebuilding authenticated HTTP calls by hand for Mongo admin, secured builder routes, diagnostics, and similar tools.

```ts
const mongo = useMongoManagementClient()
const databases = await mongo.getDatabases()
```

## Phase 5 — Keycloak bridge and runtime diagnostics

Phase 5 adds two pieces:

- `useKeycloakBridge()` to explicitly synchronize Keycloak -> FeathersJS
- richer diagnostics through `useAuthDiagnostics()` and `auth.getStateSnapshot()`

### `useKeycloakBridge()`

```ts
const bridge = useKeycloakBridge()
await bridge.ensureSynchronized('page-enter')
```

This helper:

- reads the current Keycloak token
- forwards token + user hint to the Feathers bridge
- lets `useAuthRuntime()` update the unified source of truth

### Richer diagnostics

The snapshot now also includes:

- `lastReadyAt`
- `lastAuthenticateAt`
- `lastReAuthenticateAt`
- `lastBridgeAt`
- `lastEnsureReason`
- `bridgePath`
- `clientSync`

Example:

```ts
const auth = useAuthRuntime()
console.log(auth.getStateSnapshot())
```


## Phase 6 — protected page helper and official auth trace

Phase 6 adds two stabilization helpers for protected tools and complex screens:

- `useProtectedPage()` to wait for `auth.ensureReady()` before a protected page starts loading data
- `useAuthDiagnostics({ stableUntilMounted: true })` to expose a stable auth snapshot until client `mounted` and avoid SSR/client mismatches
- `useAuthTrace()` to inspect the recent auth runtime event history

### `useProtectedPage()`

```ts
const page = useProtectedPage({
  auth: 'required',
  validateBearer: true,
  reason: 'mongo-page',
})

await page.ensure()
if (!page.authorized.value)
  return
```

### `useAuthTrace()`

```ts
const trace = useAuthTrace()
console.log(trace.value.latest)
console.log(trace.value.items)
```

The runtime now keeps a bounded auth event log (bootstrap, session sync, Keycloak bridge, reauth, protected page decisions).

### Normal case: no stored token yet

When an app starts without an existing session, Feathers typically tries `reAuthenticate()` and then lets the UI show a login screen if no token is available. Since `6.4.125`, NFZ no longer classifies that case as `error`: the runtime stays `anonymous` with `tokenSource = 'none'`.

So on `/auth-runtime`:

- `status = anonymous`
- `authenticated = false`
- `tokenSource = none`

simply mean “no stored session yet”, not “authentication is broken”.

## Official playground surfaces

The playground now exposes two useful screens to validate the auth runtime:

- `/auth-runtime`: current state, enriched diagnostics, and recent auth event trace
- `/mongo`: protected tool example built on top of `useProtectedPage()` + `useMongoManagementClient()`, with database/collection auto-discovery and direct REST route probes

## Practical rule

For protected NFZ tools:

- do not rebuild `Authorization` manually
- do not read the token from multiple competing locations
- use `useAuthRuntime()`, `useAuthenticatedRequest()`, `useProtectedService()`, `useProtectedTool()`
- for Keycloak SSO, use `useKeycloakBridge()` when a screen needs an explicit synchronization step before a protected call

> In embedded mode, `useMongoManagementClient()` automatically resolves the Mongo management base path behind the embedded REST prefix. The routes shown in the playground are REST endpoints to call through the NFZ client helpers, not Vue Router pages.
