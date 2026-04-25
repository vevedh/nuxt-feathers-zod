---
editLink: false
---
# Keycloak SSO (Keycloak-only)

Ce guide décrit le mode **Keycloak-only** de `nuxt-feathers-zod` : l'application Nuxt utilise Keycloak comme source d'identité, sans formulaire d'authentification locale Feathers.

> Important : ne pas utiliser un bloc `auth` contenant un champ `provider: 'keycloak'` comme configuration principale. `provider` n'est pas une option stricte du bloc `auth`. Le runtime NFZ détecte Keycloak via le bloc `feathers.keycloak` et/ou via `feathers.client.remote.auth.payloadMode = 'keycloak'`.

## Objectifs

- Garder une application publique accessible sans login global.
- Protéger seulement certaines routes, par exemple `/console/**`.
- Utiliser le token Keycloak comme Bearer pour les appels HTTP protégés.
- Laisser `useAuthRuntime()` synchroniser l'état d'authentification côté client.

## Variante A — Keycloak-only avec bridge embedded

Cette variante convient quand l'application Nuxt embarque NFZ et doit exposer un bridge Keycloak local, par défaut `/_keycloak`.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    // Désactive l'auth locale Feathers générée par défaut.
    // Keycloak devient la source d'identité côté navigateur.
    auth: false,

    keycloak: {
      serverUrl: 'https://keycloak.example.com',
      realm: 'MYREALM',
      clientId: 'my-nuxt-app',

      // Bridge NFZ utilisé par useKeycloakBridge().
      authServicePath: '/_keycloak',

      // Optionnel : résolution/création de l'utilisateur applicatif.
      userService: 'users',
      serviceIdField: 'keycloakId',

      permissions: false,
      onLoad: 'check-sso',
    },
  },
})
```

Dans ce mode, le plugin client `keycloak-sso` initialise `keycloak-js`, puis `useKeycloakBridge()` synchronise la session Keycloak vers `useAuthRuntime()`.

## Variante B — Nuxt remote + API Feathers protégée par Keycloak

Cette variante convient quand Nuxt consomme une API Feathers distante. Le client NFZ utilise le token Keycloak pour s'authentifier auprès du service distant d'authentification.

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

        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true,
          storageKey: 'feathers-jwt',
        },
      },
    },

    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'MYREALM',
      clientId: 'my-nuxt-app',
      onLoad: 'check-sso',
    },
  },
})
```

Avec `payloadMode: 'keycloak'`, le payload envoyé au backend contient `access_token`, mais aussi des alias de compatibilité comme `accessToken`, `token` et `jwt`.

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

## onLoad

- `check-sso` : tente une session SSO silencieuse sans forcer le login global.
- `login-required` : force un login Keycloak avant d'utiliser l'application.

Pour une console admin ou un dashboard, préférer généralement `check-sso` + middleware de route ciblé.

## Générer le middleware Nuxt

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```

Le générateur crée notamment :

```txt
app/middleware/auth-keycloak.ts
public/silent-check-sso.html
```

Exemple simplifié pour protéger uniquement `/console/**` :

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  if (!to.path.startsWith('/console'))
    return

  const { $keycloak } = useNuxtApp()

  if (!$keycloak?.authenticated) {
    await $keycloak.login({
      redirectUri: window.location.origin + to.fullPath,
    })
  }
})
```

## Utilisation côté application

Pour les pages critiques, éviter d'appeler directement `$api.service(...)` avant que l'auth soit prête. Utiliser la couche runtime NFZ :

```ts
const auth = useAuthRuntime()
await auth.ensureReady()
```

Pour les appels HTTP protégés :

```ts
const request = useAuthenticatedRequest()

const result = await request('/feathers/users', {
  auth: 'required',
})
```

Pour protéger une page :

```ts
const page = useProtectedPage({
  auth: 'required',
  validateBearer: true,
  reason: 'admin-console',
})

onMounted(async () => {
  await page.ensure()
})
```

## Exemple complet Nuxt 4 remote

Pour un exemple complet avec :

- génération CLI du middleware `auth-keycloak`
- route `/private` protégée
- appel à un service Feathers distant

voir :

- [Exemple complet : app Nuxt 4 en mode remote + Keycloak + service distant](./remote-keycloak-app)

## Résumé du flow

```txt
Keycloak navigateur
  ↓
plugin keycloak-sso
  ↓
useKeycloakBridge()
  ↓
useAuthRuntime()
  ↓
useAuthenticatedRequest() / useAuthBoundFetch()
  ↓
API Feathers protégée
```
