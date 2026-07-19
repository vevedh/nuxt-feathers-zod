---
editLink: false
---
# Nuxt 4 remote + client-only Keycloak example

Starting with NFZ `6.5.30`, the recommended example keeps Keycloak **outside the NFZ runtime**. The Nuxt application initializes Keycloak on the client, then uses NFZ as the remote Feathers client.

## Short configuration

```ts
export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  runtimeConfig: {
    public: {
      keycloak: {
        serverUrl: 'https://keycloak.example.local',
        realm: 'EXAMPLE',
        clientId: 'nuxt-app',
        onLoad: 'check-sso',
      },
    },
  },

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.local',
        transport: 'rest',
        restPath: '',
        services: [
          { path: 'authentication', methods: ['create', 'remove'] },
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
      pinia: true,
    },

    keycloak: false,
    auth: false,
    server: { enabled: false },
  },
})
```

## Optional LDAP usage

```ts
const { $api } = useNuxtApp()
const sso = useSsoSessionStore()

const result = await $api.service('authentication').create({
  strategy: 'keycloak-ldap',
  username: sso.username,
  authenticated: true,
  access_token: sso.token,
  tokenParsed: sso.tokenParsed,
  ssoUser: sso.tokenParsed,
})
```

## Complete example

The complete model is provided in:

```txt
examples/nuxt4-keycloak-ldap-spa-ref/
```

It includes Nuxt 4 SPA, Quasar, UnoCSS, Pinia, client-only Keycloak, direct NFZ `6.6.0` remote mode, LDAP auto-sync after `keycloak.init()` and a manual synchronization button.

## Watch points

- Keycloak must live in `app/plugins/keycloak.client.ts`.
- The `#state=...` URL must be cleaned only after `keycloak.init()`.
- The backend must handle `OPTIONS /authentication`.
- Do not configure `feathers.keycloak` in this model.
