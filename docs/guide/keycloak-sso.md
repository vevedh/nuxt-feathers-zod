---
editLink: false
---
# Keycloak SSO

Ce flux fait de **Keycloak la source d’identité** côté navigateur, puis matérialise une session Feathers via le service `authentication`.

## Exemple : nouvelle app Nuxt 4 + remote + Keycloak

```bash
bunx nuxi@latest init my-nfz-keycloak
cd my-nfz-keycloak
bun install
bun add nuxt-feathers-zod keycloak-js
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --auth true --payloadMode keycloak --force
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm myrealm --clientId myapp
bunx nuxt-feathers-zod add middleware auth-keycloak --target route
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bun dev
```

## Fichier requis

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

## Configuration type

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest',
        auth: {
          enabled: true,
          payloadMode: 'keycloak',
          strategy: 'jwt',
          tokenField: 'access_token',
          servicePath: 'authentication',
          reauth: true
        }
      }
    },
    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'myrealm',
      clientId: 'myapp',
      onLoad: 'check-sso'
    },
    auth: true
  }
})
```

## Payload envoyé à Feathers

```ts
await client.service('authentication').create({
  strategy: 'jwt',
  access_token: keycloak.token
})
```

## Conseils de stabilisation

- garder `tokenField` explicite
- documenter les Redirect URIs et Web Origins côté Keycloak
- tester d’abord en remote REST pour isoler les problèmes SSO


## Pattern recommandé avec runtime helper

```ts
const auth = useAuthRuntime()
await auth.ensureReady()

const request = useAuthenticatedRequest()
const data = await request('/api/private')
```

Ce pattern évite de reconstruire l’en-tête Bearer à la main et garde Keycloak + Feathers alignés via le runtime auth unifié.
