# RuntimeConfig

Le module expose des infos dans `runtimeConfig` :

- `runtimeConfig._feathers` (server)
- `runtimeConfig.public._feathers` (client)

## `public._feathers`

Contient notamment :

- `transports`
- `auth` (si auth locale activée)
- `pinia` (si client pinia activé)
- `keycloak` (si keycloak activé) :
  - `authServicePath`
  - `onLoad`

Ces valeurs sont utilisées par les plugins runtime (client et server).
