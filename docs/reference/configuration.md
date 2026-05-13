# Configuration

La configuration du module se place dans la clé `feathers` de `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

## Options principales

| Option | Rôle |
|---|---|
| `client` | Mode client, transport et comportement de connexion. |
| `server` | Activation et options du serveur embedded. |
| `servicesDirs` | Dossiers scannés pour les services. |
| `transports` | REST et Socket.io. |
| `auth` | Authentification locale/JWT. |
| `keycloak` | Paramètres Keycloak côté client et bridge. |
| `database` | Configuration MongoDB et options de management. |
| `validator` | Validateur utilisé par les schémas. |
| `swagger` | Documentation Swagger legacy. |
| `console` | Console/builder embarqué lorsque disponible. |
| `devtools` | Intégration DevTools lorsque disponible. |

## Runtime config

Le module écrit une configuration privée et une configuration publique sous `_feathers`.

- `runtimeConfig._feathers` : valeurs serveur privées ;
- `runtimeConfig.public._feathers` : valeurs accessibles côté client.

Les secrets doivent rester dans la configuration privée ou dans les variables d'environnement serveur.

## Exemple embedded MongoDB

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: {
      rest: { enabled: true, path: '/feathers' },
      websocket: { enabled: true },
    },
    database: {
      mongodb: {
        enabled: true,
        url: process.env.MONGO_URL,
      },
    },
  },
})
```

## Exemple remote

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      url: 'https://api.example.com',
      transport: 'socketio',
    },
    auth: {
      enabled: true,
    },
  },
})
```

## Bonne pratique

Centraliser les valeurs d'environnement dans `.env` et ne jamais dupliquer les secrets dans le code source.
