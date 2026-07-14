---
editLink: false
---
# Keycloak SSO client-only

Ce guide historique est conservé pour compatibilité documentaire. Depuis NFZ `6.5.30`, la règle est simple : **Keycloak reste côté client**.

NFZ initialise `keycloak-js` dans le navigateur, puis expose :

```ts
const auth = useAuth()

auth.ssoUser.value
auth.ssoToken.value
auth.feathersUser.value
auth.feathersToken.value
```

## Configuration recommandée

```ts
export default defineNuxtConfig({
  ssr: false,

  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        restPath: '',
        services: [
          { path: 'authentication', methods: ['create', 'remove'] },
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
    },

    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'MYREALM',
      clientId: 'my-nuxt-app',
      onLoad: 'check-sso',
      mode: 'client-only',
    },

    auth: false,
    server: { enabled: false },
  },
})
```

## Bridge backend explicite

Si une API Feathers distante expose une stratégie `keycloak-ldap`, l'application appelle directement le service `authentication` via NFZ remote :

```ts
const { $api } = useNuxtApp()
const sso = useSsoSessionStore()

await $api.service('authentication').create({
  strategy: 'keycloak-ldap',
  username: sso.username,
  authenticated: true,
  access_token: sso.token,
  tokenParsed: sso.tokenParsed,
  ssoUser: sso.tokenParsed,
})
```

Ne configure pas `remote.auth.payloadMode = 'keycloak'` et ne crée pas de proxy Nitro si le CORS backend est corrigé. Le modèle validé garde Keycloak hors du runtime NFZ avec `feathers.keycloak: false`.

## Fichier requis pour le silent SSO

Créer `public/silent-check-sso.html` :

```html
<!doctype html>
<html>
  <body>
    <script>
      parent.postMessage(location.href, location.origin)
    </script>
  </body>
</html>
```

Dans Keycloak, autoriser :

- Redirect URIs : `https://ton-site/*` et `https://ton-site/silent-check-sso.html`
- Web origins : `https://ton-site`

Voir aussi : [Keycloak SSO client-only](/guide/keycloak-sso) et [Remote Keycloak SSO + bridge LDAP/AD](/guide/remote-keycloak-ldap).
