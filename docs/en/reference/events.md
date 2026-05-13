# Events and hooks

This page describes runtime events and Feathers hooks that are useful when diagnosing a `nuxt-feathers-zod` application.

## Authentication events

`useAuthRuntime()` exposes a session event history. The current event types cover:

| Event | Meaning |
|---|---|
| `ensure-start` | Session verification started. |
| `ensure-finish` | Session verification finished. |
| `session-sync` | General session synchronization. |
| `sso-session-sync` | SSO session synchronization. |
| `feathers-session-sync` | Feathers session synchronization. |
| `authenticate` | Explicit authentication. |
| `reauth-skipped` | Restore skipped. |
| `reauth-success` | Restore succeeded. |
| `reauth-failure` | Restore failed. |
| `logout` | Logout. |
| `keycloak-client-session` | Client-side Keycloak session detected. |
| `keycloak-bridge-success` | Keycloak to Feathers bridge succeeded. |
| `keycloak-bridge-fallback` | Keycloak bridge fallback. |
| `keycloak-bearer-validated` | Bearer token validated. |
| `keycloak-bearer-missing` | Bearer token missing. |
| `protected-page-ready` | Protected page authorized. |
| `protected-page-blocked` | Protected page blocked. |

## Reading events

```ts
const auth = useAuthRuntime()
const snapshot = auth.getStateSnapshot()

console.log(snapshot.events)
```

## Clearing diagnostics

```ts
const auth = useAuthRuntime()
auth.clearEvents()
auth.resetDiagnostics()
```

## Feathers hooks

Feathers hooks are the best entry point for tracing business calls.

```ts
export const traceHook = async (context, next) => {
  const startedAt = Date.now()

  try {
    await next()
    console.info('service:success', {
      path: context.path,
      method: context.method,
      duration: Date.now() - startedAt,
    })
  }
  catch (error) {
    console.error('service:error', {
      path: context.path,
      method: context.method,
      duration: Date.now() - startedAt,
      error,
    })
    throw error
  }
}
```

## Recommendation

For a business application, combine:

- `useAuthRuntime()` events for session diagnostics;
- `around`, `before`, `after` and `error` hooks for services;
- server logs for infrastructure;
- domain stores or composables for the UI.
