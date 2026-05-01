---
editLink: false
---
# Exemple Nuxt 4 remote + Keycloak

Cette page remplace l’ancien contenu de maintien de navigation par une explication opérationnelle de l’authentification Keycloak côté Nuxt avec une API Feathers distante. Elle est destinée aux développeurs qui veulent comprendre l’option, l’activer dans `nuxt.config.ts` et vérifier son comportement dans un projet Nuxt 4.

## Objectif

Cette option ou fonctionnalité permet de garder une architecture cohérente entre le module Nuxt, le runtime Feathers, les services générés, le client TypeScript et le CLI. L’exemple ci-dessous donne une base directement réutilisable.

## Quand utiliser cette option ?

Utilise cette page lorsque tu veux :

- configurer précisément l’authentification Keycloak côté Nuxt avec une API Feathers distante ;
- documenter le choix dans un starter ou une application ;
- tester rapidement le comportement avec une commande CLI ;
- éviter les divergences entre configuration, fichiers générés et runtime.

## Exemple de configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

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
          reauth: true,
        },
        services: [
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
    },
    keycloak: {
      serverUrl: 'https://sso.example.com',
      realm: 'internal',
      clientId: 'nuxt-app',
      onLoad: 'check-sso',
      authServicePath: '/_keycloak',
    },
    server: { enabled: false },
    auth: false,
  }
})
```

## Exemple CLI

```bash
bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example.com --realm internal --clientId nuxt-app
```

## Exemple d’utilisation

```ts
const service = useService('messages')

const result = await service.find({
  query: {
    $limit: 10,
    $sort: { createdAt: -1 },
  },
})
```

## Points de vigilance

- Les chemins exposés (`/feathers`, `/socket.io`, `/mongo`, `/api/nfz`) doivent être documentés dans le projet applicatif.
- Les options qui exposent une surface d’administration doivent être protégées avant un déploiement hors local.
- Les services générés par le CLI restent préférables aux services écrits manuellement pour conserver le manifest, les types et les hooks.

## Bonnes pratiques

- Lance `bunx nuxt-feathers-zod doctor` après la modification.
- Utilise `--dry` avant les commandes qui écrivent dans le projet.
- Versionne les fichiers générés importants et documente toute option non standard.
- Teste un appel REST minimal avant de diagnostiquer le frontend.

<!-- release-version: 6.5.23 -->
