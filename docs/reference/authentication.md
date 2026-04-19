---
editLink: false
---
# Authentification

Le core open source couvre trois scénarios principaux :

- auth locale/JWT embedded
- auth JWT remote
- bridge Keycloak SSO

Depuis `6.4.92+`, le runtime client utilise aussi une source de vérité auth unifiée via `useAuthRuntime()`.

## Embedded

Quand `feathers.auth = true` en mode embedded :

- le serveur Feathers local expose `authentication`
- un service `users` local est généralement nécessaire
- la CLI est la voie recommandée pour générer ce service

Exemple :

```bash
bunx nuxt-feathers-zod init embedded --force --auth
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.


## Champs locaux exposés côté runtime public

En auth embedded, la config publique contient désormais aussi les champs locaux résolus :

- `runtimeConfig.public._feathers.auth.local.usernameField`
- `runtimeConfig.public._feathers.auth.local.passwordField`
- `runtimeConfig.public._feathers.auth.local.entityUsernameField`
- `runtimeConfig.public._feathers.auth.local.entityPasswordField`

La valeur par défaut NFZ reste `userId/password`.

Depuis `6.4.123`, cette configuration n’est pas seulement exposée au runtime public : elle est aussi injectée côté serveur Feathers via `app.set('authentication', config)` avant `new AuthenticationService(app, 'authentication')`, conformément à l’API officielle Feathers.

## Remote

En mode remote, la config se situe sous `feathers.client.remote.auth`.

Exemple :

```ts
remote: {
  auth: {
    enabled: true,
    payloadMode: 'jwt',
    strategy: 'jwt',
    tokenField: 'accessToken',
    servicePath: 'authentication',
    reauth: true,
  }
}
```

## Keycloak

Le module supporte un bridge Keycloak -> Feathers :

```ts
await client.service('authentication').create({
  strategy: 'jwt',
  access_token: keycloak.token
})
```

Le bridge normalise aussi plusieurs alias utiles :

- `access_token`
- `accessToken`
- `jwt`
- `token`
- `bearer`
- `user` / `keycloakUser` / `tokenParsed`

## Recommandation runtime

Pour les pages ou outils protégés :

- attendre `auth.ensureReady()`
- utiliser `useAuthenticatedRequest()` pour les routes HTTP protégées
- utiliser `useProtectedService()` pour les services Feathers protégés
