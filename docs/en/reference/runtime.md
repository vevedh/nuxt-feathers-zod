---
editLink: false
---
# Client runtime

## Official auth composables

- `useAuthRuntime()`
- `useAuthenticatedRequest()`
- `useAuthBoundFetch()`
- `useProtectedService()`
- `useProtectedTool()`
- `useMongoManagementClient()`
- `useKeycloakBridge()`
- `useProtectedPage()`
- `useAuthTrace()`
- `useAuthDiagnostics()`

## `useAuthRuntime()`

Exposes the unified auth state and the main methods:

- `ensureReady(reason?)`
- `authenticate(payload)`
- `reAuthenticate()`
- `logout()`
- `setSession()`
- `synchronizeKeycloakSession()`
- `ensureValidatedBearer()`
- `getAuthorizationHeader()`
- `getStateSnapshot()`
- `clearEvents()`
- `resetDiagnostics()`

### Diagnostic snapshot

The snapshot includes:

- `provider`
- `status`
- `ready`
- `tokenSource`
- `lastSyncAt`
- `lastReadyAt`
- `lastAuthenticateAt`
- `lastReAuthenticateAt`
- `lastBridgeAt`
- `lastEnsureReason`
- `bridgePath`
- `clientSync`
- `events`
- `hydrationState` (`stable-until-mounted` or `live`)

### Status semantics

- `bootstrapping`: the runtime is still initializing the session.
- `authenticated`: a usable Feathers session is ready.
- `anonymous`: the runtime is ready but no token/session is available.
- `error`: a real auth attempt failed while a token or an explicit auth request was present.

Since `6.4.125`, a startup `reAuthenticate()` with no stored token no longer marks the runtime as `error`: it stays `anonymous`, which matches the normal Feathers client flow when no session exists yet.

## `useKeycloakBridge()`

Dedicated Keycloak SSO helper to explicitly synchronize the token and user hint into FeathersJS.

Methods:

- `ensureSynchronized(reason?)`
- `refreshAndSynchronize(minValidity?, reason?)`

## `useProtectedPage()`

Bootstrap helper for protected pages. It waits for the auth runtime, can validate the Keycloak bearer, and exposes `authorized`, `ready`, `pending`, `hydrated`, `displayState`, and `ensure()`.

Useful details:

- `stableUntilMounted` defaults to `true` to avoid false intermediate auth states during client hydration.
- `displayState` provides a simple UI state: `hydrating`, `pending`, `authorized`, `blocked`, `error`, or `idle`.

## `useAuthTrace()`

Exposes a bounded auth runtime event history:

- `count`
- `latest`
- `items`

## `useAuthDiagnostics()`

By default, `useAuthDiagnostics()` returns a stable snapshot until client `mounted`. This is the recommended mode for auth-sensitive pages (Mongo, diagnostics, protected tools) to avoid SSR/client mismatches.

Example:

```ts
const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
```
