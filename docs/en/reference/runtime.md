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
