# Playground scenarios validation

The playground now supports 5 explicit scenarios through env files:

- `.env.embedded-local.example`
- `.env.embedded-auth-keycloak.example`
- `.env.remote-rest.example`
- `.env.remote-socketio-jwt.example`
- `.env.remote-socketio-keycloak.example`

Recommended workflow:

1. Copy one scenario file to `playground/.env`
2. Run `bun dev playground`
3. Open `/validation`
4. Open `/tests`
5. Validate connection/auth flow for the active scenario

Notes:

- `remote + socketio + JWT stored`: pre-seed `localStorage["feathers-jwt"]`
- `remote + socketio + Keycloak`: configure `KC_URL`, `KC_REALM`, `KC_CLIENT_ID`
- `remote + rest only`: keep `NFZ_REMOTE_TRANSPORT=rest`
- `embedded + local auth unchanged`: keep `NFZ_CLIENT_MODE=embedded`


## embedded + auth + Keycloak

Copier `playground/.env.embedded-auth-keycloak.example` vers `playground/.env`, puis lancer le playground.
Valider `/validation` puis `/tests` : provider `keycloak`, bridge d'auth actif, whoami/updateToken/logout, et accès aux services embedded après SSO.
