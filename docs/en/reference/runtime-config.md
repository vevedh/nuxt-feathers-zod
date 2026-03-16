---
editLink: false
---
# RuntimeConfig

The module exposes its runtime settings in:

- `runtimeConfig._feathers` (server)
- `runtimeConfig.public._feathers` (client)

Those values drive runtime plugins (client/server) and are useful for diagnostics.

## `public._feathers` (client)

Key fields:

- `transports` (embedded)
- `client.mode`: `'embedded' | 'remote'`
- `client.remote`: url / transport / restPath / websocketPath / services (remote-mode source of truth)
- `client.auth`: auth config (servicePath, strategy, tokenField, payloadMode…)
- `keycloak`: Keycloak config (serverUrl, realm, clientId, onLoad…)

## Environment variables (playground)

The playground can inject values via `.env`:

```bash
NFZ_CLIENT_MODE=remote
NFZ_REMOTE_URL="https://svrapi.domain.ltd"
NFZ_REMOTE_TRANSPORT="rest"
NFZ_REMOTE_REST_PATH="/api/v1"
NFZ_REMOTE_WS_PATH="/socket.io"
NFZ_REMOTE_AUTH_STRATEGY=jwt
NFZ_REMOTE_AUTH_TOKEN_FIELD=access_token
```

## Quick diagnosis

In the playground, `/tests` renders a JSON snapshot of `runtimeConfig.public._feathers` (client-only).
