# Configuration

La configuration du module se fait dans le bloc `feathers` de `nuxt.config.ts`.

Cette page donne les configurations les plus courantes. Pour la liste détaillée des options, consulte la [référence des options](/reference/options).

## Configuration embedded minimale

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-feathers-zod',
  ],

  feathers: {
    servicesDirs: ['services'],

    client: {
      mode: 'embedded',
    },

    server: {
      enabled: true,
      framework: 'express',
    },

    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: true,
    },

    auth: false,
  },
})
```

## Configuration embedded avec MongoDB

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-feathers-zod',
  ],

  feathers: {
    servicesDirs: ['services'],

    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
      },
    },

    client: {
      mode: 'embedded',
      pinia: true,
    },

    server: {
      enabled: true,
      framework: 'express',
      secureDefaults: true,
    },
  },
})
```

## Configuration remote

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '/feathers',
        services: [
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
    },

    server: {
      enabled: false,
    },

    auth: false,
  },
})
```

## Configuration remote Keycloak

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'socketio',
        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true,
        },
      },
    },

    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'myrealm',
      clientId: 'my-nuxt-app',
      onLoad: 'check-sso',
    },

    server: {
      enabled: false,
    },
  },
})
```

## Bonnes pratiques

- Garde une configuration explicite en production.
- Désactive `auth` tant que le service `users` n’existe pas.
- En remote, désactive le serveur embedded si tu n’en as pas besoin.
- En embedded, documente le chemin REST utilisé par les frontends et les proxies.
- Utilise `doctor` après toute modification importante.
