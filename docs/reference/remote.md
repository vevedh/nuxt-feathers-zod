---
editLink: false
---
# Mode remote

En mode remote, le module ne démarre aucun serveur Feathers local.
Il configure uniquement un client Feathers vers une API distante.

## Vue d'ensemble

```txt
Nuxt app
└─ Feathers client
   └─ Remote Feathers API
```

## Configuration minimale

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.com',
        transport: 'rest'
      }
    }
  }
})
```

## Paramètres clés

- `url`
- `transport`
- `restPath`
- `websocketPath`
- `services`
- `auth`

## Auth distante

Le mode remote supporte notamment :

- `payloadMode: 'jwt'`
- `payloadMode: 'keycloak'`

avec un bridge client côté application si nécessaire.
