---
editLink: false
---
# Doctor

Run:

```bash
bunx nuxt-feathers-zod doctor
```

Typical checks include:

### Embedded mode

- `feathers.client.mode`
- `transports.rest.path`
- `servicesDirs`
- detected embedded services
- embedded auth:
  - `auth.enabled`
  - `auth.service`
  - `auth.entity`
  - `auth.authStrategies`
  - `auth.local.usernameField`
  - `auth.local.passwordField`
  - `auth.local.entityUsernameField`
  - `auth.local.entityPasswordField`
  - a Feathers local payload example (`{ strategy: 'local', ... }`)
  - a warning when request and entity fields diverge
- MongoDB signals
- detected Feathers plugins
- `database.mongo` configuration hints

### Remote mode

- configured remote URL
- `rest | socketio` transport
- whether remote auth is enabled
- `payloadMode`
- declared remote services
- Keycloak configuration when needed

## Goal

Doctor should produce actionable messages such as:

- generate a missing service
- enable `servicesDirs`
- fix local auth configuration
- verify the remote target
- spot an inconsistent CLI/runtime baseline before an OSS-core release

## Local auth note

When doctor detects a local mapping where request fields and entity fields differ (for example `email/password` in the login form but `userId/passwordHash` on the entity), it emits an explicit warning. In that case, consumer UIs should use `buildLocalAuthPayload()` or `runtimeConfig.public._feathers.auth.local` instead of hardcoding the local payload shape.
