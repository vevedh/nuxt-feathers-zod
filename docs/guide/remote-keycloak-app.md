---
editLink: false
---
# Exemple Nuxt 4 remote + Keycloak client-only

Depuis NFZ `6.5.30`, l'exemple recommandé garde Keycloak **hors du runtime NFZ**. L'application Nuxt initialise Keycloak côté client, puis utilise NFZ comme client Feathers remote.

## Configuration courte

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

## Utilisation LDAP optionnelle

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

## Exemple complet

Le modèle complet est fourni dans :

```txt
examples/nuxt4-keycloak-ldap-spa-ref/
```

Il contient Nuxt 4 SPA, Quasar, UnoCSS, Pinia, Keycloak client-only, NFZ `6.5.30` remote direct, auto-sync LDAP après `keycloak.init()` et bouton de synchronisation manuel.

## Points de vigilance

- Keycloak doit être dans `app/plugins/keycloak.client.ts`.
- L'URL `#state=...` doit être nettoyée seulement après `keycloak.init()`.
- Le backend doit gérer `OPTIONS /authentication`.
- Ne configure pas `feathers.keycloak` dans ce modèle.
