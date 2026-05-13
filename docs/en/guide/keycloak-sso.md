---
editLink: false
---
# Client-only Keycloak SSO

Starting with NFZ `6.5.30`, the recommended model is simple: **Keycloak stays on the Nuxt client**.

NFZ should not orchestrate the OAuth/OIDC callback, should not manage `#state=...`, and should not expose a Nitro LDAP proxy. NFZ remains the remote Feathers client.

```txt
Keycloak = browser SSO identity
NFZ = remote Feathers client
LDAP/AD = Feathers backend enrichment
```

## Recommended configuration

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

## Keycloak client plugin

The application initializes `keycloak-js` in `app/plugins/keycloak.client.ts`, then stores `token` and `tokenParsed` in a Pinia store. The URL cleanup must run **after** `keycloak.init()`.

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

Do not clean `#state=...` before `keycloak.init()`, otherwise Keycloak cannot complete the callback.

## Explicit LDAP bridge

When the Feathers backend exposes a `keycloak-ldap` strategy, the application directly calls NFZ remote:

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

The backend response becomes the enriched application session:

```ts
const ldapUser = result.user
const feathersToken = result.accessToken
```

## Stabilization rules

- keep `ssr: false` for Keycloak SPA applications;
- keep Keycloak in a Nuxt client plugin;
- configure `feathers.keycloak: false`;
- do not create a Nitro `/api/keycloak-ldap` proxy when backend CORS is fixed;
- separate `sso-session` and `ldap-session`;
- the backend must accept `OPTIONS /authentication` and `POST /authentication`.

Full guide: [Nuxt 4 SPA + client-only Keycloak + LDAP backend](/en/guide/remote-keycloak-ldap).
