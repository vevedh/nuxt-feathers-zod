---
editLink: false
---
# Runtime client

## Composables auth officiels

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

Expose l'état auth unifié et les méthodes principales :

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

### Snapshot de diagnostic

Le snapshot inclut notamment :

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
- `hydrationState` (`stable-until-mounted` ou `live`)

## `useKeycloakBridge()`

Helper dédié à Keycloak SSO pour forcer une synchronisation explicite du token et du user hint vers FeathersJS.

Méthodes :

- `ensureSynchronized(reason?)`
- `refreshAndSynchronize(minValidity?, reason?)`

## `useProtectedPage()`

Helper de bootstrap pour les pages protégées. Il attend le runtime auth, peut valider le bearer Keycloak, puis expose `authorized`, `ready`, `pending`, `hydrated`, `displayState` et `ensure()`.

Points utiles :

- `stableUntilMounted` vaut `true` par défaut pour éviter les faux états pendant l’hydratation client.
- `displayState` expose un état UI simple parmi `hydrating`, `pending`, `authorized`, `blocked`, `error`, `idle`.

## `useAuthTrace()`

Expose un historique borné des événements auth du runtime :

- `count`
- `latest`
- `items`

## `useAuthDiagnostics()`

Par défaut, `useAuthDiagnostics()` renvoie un snapshot stable jusqu’au `mounted` client. C’est le mode recommandé pour les pages sensibles à l’auth (Mongo, diagnostics, outils protégés) afin d’éviter les mismatches SSR/client.

Exemple :

```ts
const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
```
