---
editLink: false
---
# RuntimeConfig

Le module expose ses infos dans :

- `runtimeConfig._feathers` (server)
- `runtimeConfig.public._feathers` (client)

Ces valeurs alimentent les plugins runtime (client/server) et servent au diagnostic.

## `public._feathers` (client)

Champs importants :

- `transports` (embedded)
- `client.mode` : `'embedded' | 'remote'`
- `client.remote` : url / transport / restPath / websocketPath / services
- `client.auth` : configuration auth (servicePath, strategy, tokenField, payloadMode…)
- `keycloak` : config Keycloak (serverUrl, realm, clientId, onLoad…)

## Variables d’environnement (playground)

Le playground peut injecter des valeurs via `.env` :

```bash
NFZ_CLIENT_MODE=remote
NFZ_REMOTE_URL="https://svrapi.domain.ltd"
NFZ_REMOTE_TRANSPORT="rest"
NFZ_REMOTE_REST_PATH="/api/v1"
NFZ_REMOTE_WS_PATH="/socket.io"
NFZ_REMOTE_AUTH_STRATEGY=jwt
NFZ_REMOTE_AUTH_TOKEN_FIELD=access_token
```

## Diagnostic rapide

Dans le playground, `/tests` affiche un snapshot JSON de `runtimeConfig.public._feathers` (client-only).
