---
title: Feathers-Pinia optionnel
description: Comprendre quand activer feathers-pinia dans nuxt-feathers-zod et quand utiliser seulement le client Feathers standard.
---

# Feathers-Pinia optionnel

Depuis la base **6.5.4**, `nuxt-feathers-zod` distingue clairement deux couches :

- **Pinia applicatif** (`@pinia/nuxt`) : stores UI classiques, session, thème, état local.
- **Feathers-Pinia** (`feathers-pinia`) : stores de services Feathers, cache client, helpers de type `useFind()` / `useGet()`.

Ces deux couches ne sont pas équivalentes. Une application peut utiliser `@pinia/nuxt` sans activer `feathers-pinia`.

## Configuration recommandée pour NFZ Studio

NFZ Studio utilise `useAuthRuntime()`, `useStudioSessionStore()` et `useAdminFeathers()`. Il n'a pas besoin de stores Feathers-Pinia.

```ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'embedded',
      pinia: false,
    },
  },
})
```

Cette configuration conserve Pinia pour les stores applicatifs, mais évite d'importer `feathers-pinia` dans le graphe navigateur.

## Activer explicitement Feathers-Pinia

Activez `feathers.client.pinia` uniquement quand vous voulez des stores de services Feathers.

```ts
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    'nuxt-feathers-zod',
  ],

  feathers: {
    client: {
      mode: 'embedded',
      pinia: {
        idField: 'id',
        services: {
          users: { idField: '_id' },
        },
      },
    },
  },
})
```

Dans ce mode, NFZ ajoute les hints Vite nécessaires pour `feathers-pinia` et les packages Feathers client.

## Matrice d'usage

| Mode | Feathers client | Auth runtime | Feathers-Pinia |
|---|---:|---:|---:|
| API embedded sans UI | Non | Non | Non |
| Embedded + client standard | Oui | Selon `auth` | Non |
| Remote REST/Socket.IO | Oui | Selon remote auth | Non par défaut |
| Remote + Keycloak | Oui | Oui | Non par défaut |
| CRUD client avec stores | Oui | Selon besoin | Oui, explicitement |

## Règle de stabilité

`feathers-pinia` ne doit jamais être importé au top-level du runtime client standard. Il est chargé dynamiquement seulement si `feathers.client.pinia` est activé. Cela évite les erreurs Vite/browser autour des exports CommonJS de `@feathersjs/feathers`.
