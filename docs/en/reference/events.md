# Events and lifecycle

## Embedded server lifecycle

The runtime uses the following phases: `infrastructure`, `modules:pre`, `plugins`, `services`, `modules:post`, `app.setup`, `routers`, `ready`, and `teardown`.

Readiness is published only after REST and Socket.IO router creation.

## Feathers events

Services keep the standard Feathers event model:

```ts
const messages = useRawService('messages')
messages.on('created', handleCreated)
messages.on('patched', handlePatched)
```

Custom methods and custom events must be explicitly declared by the service.

## Authentication trace events

The authentication runtime exposes the following event types:

- `ensure-start`
- `ensure-finish`
- `session-sync`
- `sso-session-sync`
- `feathers-session-sync`
- `authenticate`
- `reauth-skipped`
- `reauth-success`
- `reauth-failure`
- `logout`
- `keycloak-client-session`
- `keycloak-bridge-success`
- `keycloak-bridge-fallback`
- `keycloak-bearer-validated`
- `keycloak-bearer-missing`
- `protected-page-ready`
- `protected-page-blocked`

These values are exported as `NFZ_AUTH_EVENT_TYPES` from `nuxt-feathers-zod/capabilities`.

Use `useAuthTrace()` and `useAuthDiagnostics()` for safe diagnostics. The `/auth-runtime` playground page displays recent state without exposing full credentials or tokens.

<!-- release-version: 6.5.41 -->
