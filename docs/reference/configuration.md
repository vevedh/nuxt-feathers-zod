---
editLink: false
---
# Configuration

La configuration du module passe par la clé `feathers` dans `nuxt.config.ts`.

## Exemple minimal embedded

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: { path: '/socket.io' }
    },
    auth: false,
    swagger: false
  }
})
```



## Express secure preset (Option A)

Le patch courant stabilise le mode **embedded + Express**. Les options fines sont portées par `feathers.server.secure` :

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    transports: {
      rest: { path: '/feathers', framework: 'express' },
      websocket: { path: '/socket.io' }
    },
    server: {
      enabled: true,
      secureDefaults: true,
      secure: {
        cors: true,
        compression: true,
        helmet: true,
        bodyParser: {
          json: true,
          urlencoded: true
        },
        serveStatic: false
      }
    }
  }
})
```

CLI équivalente :

```bash
bunx nuxt-feathers-zod init embedded   --framework express   --cors true   --compression true   --helmet true   --bodyParserJson true   --bodyParserUrlencoded true
```

## Exemple minimal remote

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '/feathers',
        websocketPath: '/socket.io'
      }
    }
  }
})
```

## Options principales

### `feathers.client`

- `mode`: `embedded | remote`
- `pinia`: active l'intégration Feathers-Pinia côté client
- `plugins`: plugins client additionnels

### `feathers.client.remote`

- `url`: URL du serveur Feathers distant
- `transport`: `rest | socketio`
- `restPath`: préfixe REST du serveur distant
- `websocketPath`: chemin Socket.IO du serveur distant
- `services`: liste déclarative des services distants
- `auth`: configuration auth distante

### `feathers.servicesDirs`

Liste des répertoires à scanner pour les services embedded.
La pratique recommandée reste :

```ts
feathers: {
  servicesDirs: ['services']
}
```

### `feathers.transports`

- `rest.path`: chemin REST local, par défaut `/feathers`
- `rest.framework`: `express | koa`
- `websocket.path`: chemin Socket.IO local

### `feathers.server`

- `enabled`: active le serveur Feathers embedded
- `plugins`: plugins serveur déclaratifs
- `modules`: server modules additionnels

### `feathers.auth`

- `false`: pas d'auth Feathers
- `true`: auth embedded ou remote selon le mode
- en embedded, un service `users` local est requis pour l'entité auth

### `feathers.keycloak`

Configuration Keycloak côté client quand le projet utilise le mode
`payloadMode: 'keycloak'` ou un flux SSO dédié.

### `feathers.templates`

Contrôle les overrides de templates runtime.
