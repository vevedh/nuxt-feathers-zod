---
editLink: false
---
# Keycloak SSO (Keycloak-only)

Ce mode désactive l'auth locale Feathers et utilise Keycloak comme source d'identité.

## Objectif

- App publique accessible sans login
- Routes protégées via middleware (Option A)
- Les appels Feathers vers des services protégés envoient `Authorization: Bearer <kc_token>`

## Configuration Nuxt

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    auth: { provider: 'keycloak' },
    keycloak: {
      serverUrl: 'https://keycloak.example.com',
      realm: 'MYREALM',
      clientId: 'my-nuxt-app',
      authServicePath: '/_keycloak',
      userService: 'users',
      serviceIdField: 'keycloakId',
      permissions: false,
      onLoad: 'check-sso',
    }
  }
})
```

## Fichier requis (silent SSO)

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

Et autoriser dans Keycloak :

- Redirect URIs : `https://ton-site/*` et `https://ton-site/silent-check-sso.html`
- Web origins : `https://ton-site`

## onLoad

- `check-sso` : SSO silencieux (Option A)
- `login-required` : force login global

## Middleware Nuxt (Option A)

Tu peux le générer automatiquement :

```bash
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
```


Protéger uniquement `/console/**` :

```ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return
  if (!to.path.startsWith('/console'))
    return

  const { $keycloak } = useNuxtApp()
  if (!$keycloak?.authenticated) {
    await $keycloak.login({ redirectUri: window.location.origin + to.fullPath })
  }
})
```

## Exemple complet Nuxt 4 remote

Pour un exemple complet avec :

- génération CLI du middleware `auth-keycloak`
- route `/private` protégée
- appel à un service Feathers distant avec `useService('messages')`

voir :

- [Exemple complet : app Nuxt 4 en mode remote + Keycloak + service distant](./remote-keycloak-app)

## Accès aux services Feathers protégés

Oui : si l'utilisateur est authentifié Keycloak, le plugin client injecte automatiquement le Bearer, et le serveur Feathers valide le JWT via JWKS et peuple `context.params.user`.
