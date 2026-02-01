---
editLink: false
---
# Keycloak SSO (Keycloak-only)

Ce mode fait de **Keycloak la seule source d’identité**.

- Le module **désactive** l’auth Feathers locale.
- Le client Nuxt initialise `keycloak-js`.
- Chaque appel Feathers (REST/socket) peut porter `Authorization: Bearer <token Keycloak>`.
- Le serveur valide le JWT via **JWKS** et peuple `context.params.user`.

> Recommandation : Option A (SSO silencieux) = `onLoad: 'check-sso'` + middleware de protection sur certaines routes.

## Pré-requis

1. Fournir les variables publiques (Nuxt runtimeConfig) :

- `KC_URL`, `KC_REALM`, `KC_CLIENT_ID`

2. Ajouter le fichier **obligatoire** :
   `public/silent-check-sso.html`

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

3. Configurer le client Keycloak :

- redirect URIs : `https://ton-site/*` et `https://ton-site/silent-check-sso.html`
- web origins : `https://ton-site`

## Configuration Nuxt

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  runtimeConfig: {
    public: {
      KC_URL: process.env.KC_URL,
      KC_REALM: process.env.KC_REALM,
      KC_CLIENT_ID: process.env.KC_CLIENT_ID,
    },
  },

  feathers: {
    // Keycloak-only
    auth: { provider: 'keycloak' },

    keycloak: {
      serverUrl: 'https://svrkeycloak.agglo.local:8443',
      realm: 'AGGLO',
      clientId: 'nuxt4app',

      // Option A
      onLoad: 'check-sso',

      authServicePath: '/_keycloak',
      userService: 'users',
      serviceIdField: 'keycloakId',

      // UMA (optionnel)
      permissions: false,
    },
  },
})
```

## Middleware de protection (Option A)

Crée `app/middleware/auth-keycloak.ts` :

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return
  const { $keycloak } = useNuxtApp()
  if (!$keycloak)
    return

  // Exemple : protéger uniquement /console
  if (!to.path.startsWith('/console'))
    return

  if (!$keycloak.authenticated) {
    await $keycloak.login({ redirectUri: window.location.origin + to.fullPath })
  }
})
```

Puis ajoute :

```ts
definePageMeta({ middleware: ['auth-keycloak'] })
```

## Accès aux services Feathers protégés

Oui : un utilisateur authentifié Keycloak peut utiliser les services Feathers protégés **si** :

1. Le client envoie le Bearer Keycloak (`Authorization`) sur les appels Feathers.
2. Le serveur valide le JWT et remplit `context.params.user`.

Le plugin client enregistre un hook qui injecte `Authorization: Bearer <token>` tant qu’un token Keycloak est disponible.
En “login redirect” (Keycloak), la page se recharge → le hook est ensuite posé.

## Endpoint bridge `/_keycloak`

Le serveur expose un service “bridge” (par défaut `/_keycloak`) pour matérialiser l’utilisateur :

- `create({ access_token })` → `{ user, permissions }`

Le plugin client appelle `whoami()` automatiquement si `authenticated === true`.

## useAuth() (recommandé)

Pour éviter d’utiliser à la fois `useAuthStore()` et `$keycloak` dans une page, utilise le composable unifié **`useAuth()`** fourni par le module.

```ts
const auth = useAuth()
await auth.init()

if (!auth.isAuthenticated.value) {
  await auth.login({ redirectUri: `${window.location.origin}/console` })
}

console.log(auth.provider.value, auth.user.value)
```

- En **Keycloak-only**, `useAuth()` pilote `$keycloak` et peut appeler `/_keycloak` (bridge) pour obtenir `{ user, permissions }`.
- En **auth locale**, `useAuth()` délègue au store `useAuthStore()`.

## useAuth() (recommandé)

Le module expose un composable `useAuth()` qui fournit une API unique quel que soit le mode (Keycloak-only ou auth locale). En mode Keycloak-only, il s’appuie sur `$keycloak` et évite d’utiliser `useAuthStore()`.
