---
editLink: false
---
# Keycloak SSO client-only

Depuis NFZ `6.5.30`, le modèle recommandé est simple : **Keycloak reste côté client Nuxt**.

NFZ ne doit pas orchestrer le callback OAuth/OIDC, ne doit pas gérer `#state=...`, et ne doit pas exposer de proxy Nitro pour LDAP. NFZ reste le client Feathers remote.

```txt
Keycloak = identité SSO navigateur
NFZ = client Feathers remote
LDAP/AD = enrichissement côté backend Feathers
```

## Configuration recommandée

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
        serverUrl: process.env.KEYCLOAK_SERVER_URL || 'https://keycloak.example.local',
        realm: process.env.KEYCLOAK_REALM || 'EXAMPLE',
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'nuxt4app',
        onLoad: process.env.KEYCLOAK_ON_LOAD || 'check-sso',
      },
    },
  },

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: process.env.NFZ_REMOTE_URL || 'https://api.example.local',
        transport: 'rest',
        restPath: process.env.NFZ_REMOTE_REST_PATH ?? '',
        services: [
          { path: 'authentication', methods: ['create', 'remove'] },
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
      pinia: true,
    },

    keycloak: false,
    auth: false,
    server: {
      enabled: false,
    },
  },
})
```

## Plugin client Keycloak

L'application initialise `keycloak-js` dans `app/plugins/keycloak.client.ts`, puis stocke `token` et `tokenParsed` dans un store Pinia. Le nettoyage de l'URL doit être fait **après** `keycloak.init()`.

```ts
const authenticated = await keycloak.init({
  onLoad: 'check-sso',
  pkceMethod: 'S256',
  checkLoginIframe: false,
  responseMode: 'fragment',
  silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
})

cleanupOidcCallbackUrl()
```

Ne nettoie pas `#state=...` avant `keycloak.init()`, sinon Keycloak ne pourra pas finaliser le callback.

## Bridge LDAP explicite

Quand le backend Feathers expose une stratégie `keycloak-ldap`, l'application appelle directement NFZ remote :

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

La réponse backend devient la session applicative enrichie :

```ts
const ldapUser = result.user
const feathersToken = result.accessToken
```

## Règles de stabilisation

- garde `ssr: false` pour les applications Keycloak SPA ;
- garde Keycloak dans un plugin client Nuxt ;
- configure `feathers.keycloak: false` ;
- ne crée pas de proxy Nitro `/api/keycloak-ldap` si le backend CORS est corrigé ;
- sépare `sso-session` et `ldap-session` ;
- le backend doit accepter `OPTIONS /authentication` et `POST /authentication`.

Guide complet : [Nuxt 4 SPA + Keycloak client-only + LDAP backend](/guide/remote-keycloak-ldap).
