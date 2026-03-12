# Playground scenarios validation

The playground now supports 6 explicit scenarios through env files:

- `.env.embedded-local.example`
- `.env.embedded-auth-keycloak.example`
- `.env.embedded-mongodb-url.example`
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


## embedded+mongodb

Le playground démarre désormais en mode `embedded` avec MongoDB activé via `mongodb-memory-server`.
Utiliser `.env.embedded-mongodb.example` comme scénario de référence pour valider les services `mongodb` (`mongos`, `users` si généré en Mongo, etc.).

## embedded+mongodb+url

Le playground supporte maintenant un mode `embedded + mongodb + url` sans démarrer `mongodb-memory-server`.
Utiliser `.env.embedded-mongodb-url.example` comme scénario de référence.
Variables clés :

- `NFZ_PLAYGROUND_EMBEDDED_MONGODB=true`
- `NFZ_PLAYGROUND_EMBEDDED_MONGODB_URL=mongodb://root:changeMe@localhost:27017/app?authSource=admin`

Compatibilité legacy : si `NFZ_PLAYGROUND_EMBEDDED_MONGODB_URL` est absent, le playground accepte aussi `MONGO_URL` comme fallback.

Si l'URL externe échoue, le playground peut revenir automatiquement sur `mongodb-memory-server` avec :

- `NFZ_PLAYGROUND_EMBEDDED_MONGODB_FALLBACK_TO_MEMORY=true`

Par défaut ce fallback est activé uniquement pour le playground afin de préserver une DX robuste.

## Désactiver MongoDB mémoire pour les runs remote-only

Si vous voulez valider uniquement le mode remote sans démarrer `mongodb-memory-server`, définissez `NFZ_PLAYGROUND_EMBEDDED_MONGODB=false`.
La valeur par défaut reste `true` pour conserver le scénario embedded + MongoDB prêt à l'emploi.
