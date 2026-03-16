---
editLink: false
---
# Mode remote

Le mode remote configure **uniquement le client Feathers** pour pointer vers un serveur externe.

## Cas d’usage

- backend Feathers déjà en production
- frontend Nuxt séparé
- proxy API externe
- bridge Keycloak vers backend distant

## Exemple : nouvelle app Nuxt 4 remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Exemple de configuration cible

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'http://localhost:3030',
        transport: 'socketio',
        restPath: '/feathers',
        websocketPath: '/socket.io',
        services: [
          { path: 'users', methods: ['find', 'get', 'create', 'patch', 'remove'] },
          { path: 'messages', methods: ['find', 'get'] }
        ]
      }
    }
  }
})
```

## Remote REST

```bash
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport rest --restPath / --force
```

## Remote Socket.IO

```bash
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport socketio --websocketPath /socket.io --force
```

## Comportement de `transport: 'auto'`

En mode remote, `auto` (ou une valeur omise) se résout actuellement vers **Socket.IO**.

```bash
bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport auto --force
```

Pour un premier diagnostic réseau ou CORS, préfère `--transport rest` afin de valider plus vite l’URL effective et la réponse HTTP brute.

## Auth remote

Quand l’API distante attend un payload JWT classique :

```bash
bunx nuxt-feathers-zod init remote \
  --url http://localhost:3030 \
  --transport rest \
  --auth true \
  --payloadMode jwt \
  --strategy jwt \
  --tokenField accessToken \
  --servicePath authentication \
  --force
```

Quand l’API attend un token issu de Keycloak :

```bash
bunx nuxt-feathers-zod init remote \
  --url http://localhost:3030 \
  --transport rest \
  --auth true \
  --payloadMode keycloak \
  --strategy jwt \
  --tokenField access_token \
  --servicePath authentication \
  --force
```

## Appeler un service distant

```ts
const users = useService('users')
const result = await users.find({ query: { $limit: 10 } })
```

## Conseils de stabilisation

- déclarer explicitement les services dans `client.remote.services`
- commencer par REST pour les diagnostics réseau
- utiliser Socket.IO quand le backend distant est déjà validé
- garder `remote.auth` minimal et explicite
