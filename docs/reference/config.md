# Configuration Nuxt (`nuxt.config.ts`)

Le module se configure via la clé `feathers`.

## Exemple complet

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],

    transports: {
      rest: { path: '/feathers', framework: 'koa' },
      websocket: true,
    },

    database: {
      mongo: { url: 'mongodb://127.0.0.1:27017/my-site' },
    },

    // Auth locale (local+JWT)
    auth: true,

    // Keycloak-only SSO
    // keycloak: { ... },

    // Swagger legacy
    swagger: false,

    // Validation
    validator: {
      formats: [],
      extendDefaults: true,
    },

    // Avancé
    loadFeathersConfig: false,
  },
})
```

## Options

### `servicesDirs`

- Type : `string | string[]`
- Défaut : `['services']`

### `transports`

- `rest.path` : préfixe d’API (défaut `'/feathers'`)
- `rest.framework` : `'koa' | 'express'`
- `websocket` : `true | false`

### `database`

- `mongo.url` : URI MongoDB

### `auth`

- `true` : active l’auth Feathers classique (local+JWT)
- `false` : désactive

> Si `keycloak` est activé, `auth` est automatiquement désactivé (Keycloak-only).

### `keycloak`

Voir `Guide -> Keycloak SSO`.

### `swagger`

- `false` : désactive
- `true | { ... }` : active feathers-swagger (legacy)
