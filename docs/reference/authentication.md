---
editLink: false
---
# Authentification

Le core open source couvre trois scénarios principaux :

- auth locale/JWT embedded,
- auth JWT remote,
- Keycloak SSO bridge.

## Embedded

Quand `feathers.auth = true` en mode embedded :

- le serveur Feathers local expose `authentication`,
- un service `users` local est généralement nécessaire,
- la CLI est la voie recommandée pour générer ce service.

Exemple :

```bash
bunx nuxt-feathers-zod init embedded --force --auth
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

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

Le module supporte un bridge Keycloak → Feathers :

```ts
await client.service('authentication').create({
  strategy: 'jwt',
  access_token: keycloak.token
})
```
