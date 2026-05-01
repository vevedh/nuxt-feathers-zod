# Modes embedded et remote

`nuxt-feathers-zod` fonctionne selon deux modes : `embedded` et `remote`.

Le choix du mode détermine où vit le serveur Feathers et comment le client Nuxt communique avec les services.

## Résumé

| Mode | Serveur Feathers | Client Nuxt | Cas d’usage |
|---|---|---|---|
| `embedded` | Dans Nitro | Local vers le même runtime | Monorepo, dashboard interne, MVP full-stack |
| `remote` | Externe | REST ou Socket.IO vers une API distante | Front Nuxt séparé, API déjà existante, SSO centralisé |

## Mode embedded

En mode embedded, NFZ génère un runtime Feathers dans `.nuxt/feathers/server` et l’enregistre dans Nitro.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    client: {
      mode: 'embedded',
      pinia: true,
    },

    server: {
      enabled: true,
      framework: 'express',
      secureDefaults: true,
    },

    transports: {
      rest: {
        path: '/feathers',
        framework: 'express',
      },
      websocket: true,
    },

    servicesDirs: ['services'],
  },
})
```

Commande CLI :

```bash
bunx nuxt-feathers-zod init embedded --force
```

### Quand choisir embedded ?

Choisis embedded si :

- tu veux un seul projet Nuxt pour le frontend et le backend ;
- tu veux exposer des services sous `/feathers/*` ;
- tu veux générer rapidement des services métier ;
- tu veux une intégration directe avec MongoDB, auth locale et console NFZ.

## Mode remote

En mode remote, NFZ n’installe pas de serveur local par défaut. Il configure le client Nuxt pour parler à une API Feathers externe.

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
        restPath: '/feathers',
        services: [
          { path: 'users', methods: ['find', 'get'] },
          { path: 'messages', methods: ['find', 'get', 'create'] },
        ],
      },
    },

    server: {
      enabled: false,
    },

    auth: false,
  },
})
```

Commande CLI :

```bash
bunx nuxt-feathers-zod init remote \
  --url https://api.example.com \
  --transport rest \
  --force
```

### Quand choisir remote ?

Choisis remote si :

- ton API Feathers existe déjà ;
- le backend est déployé séparément ;
- plusieurs frontends consomment le même backend ;
- tu utilises un SSO centralisé comme Keycloak ;
- tu veux éviter tout runtime serveur Feathers dans Nuxt.

## Transport REST

```ts
feathers: {
  transports: {
    rest: {
      path: '/feathers',
      framework: 'express',
    },
    websocket: false,
  },
}
```

Avantages :

- simple à déboguer ;
- compatible proxies et outils HTTP ;
- bon choix pour CRUD classique.

## Transport Socket.IO

```ts
feathers: {
  transports: {
    rest: {
      path: '/feathers',
      framework: 'express',
    },
    websocket: {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      connectTimeout: 45000,
    },
  },
}
```

Avantages :

- events temps réel ;
- meilleure UX pour notifications, chat, dashboards live ;
- compatible authentification Feathers avec reauth.

## Bonnes pratiques

- En embedded, commence avec REST + websocket activé, puis désactive ce qui n’est pas utilisé.
- En remote, déclare explicitement les services distants consommés.
- En production, évite les chemins ambigus : garde `/feathers` pour REST et `/socket.io` pour Socket.IO.
- Documente le mode choisi dans le README applicatif.
