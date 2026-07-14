# Modes embedded et remote

Le module propose deux modes client. Le choix détermine où vit l’application Feathers et comment le client Nuxt s’y connecte.

## Mode embedded

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

Le serveur Feathers est démarré dans Nitro. Le module découvre les services, prépare l’infrastructure, exécute les modules et plugins, enregistre les services, appelle `app.setup()`, configure les routeurs, puis marque l’instance `default` comme prête.

À privilégier pour :

- une application Nuxt full-stack ;
- un monorepo métier ;
- des services Feathers maintenus avec l’interface ;
- un déploiement unique Nuxt/Nitro.

## Mode remote

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: 'https://api.example.test',
        transport: 'socketio',
        services: [
          { path: 'users' },
          { path: 'articles', methods: ['find', 'get'] },
        ],
      },
    },
  },
})
```

Nuxt ne démarre pas le serveur Feathers embedded par défaut. Le client se connecte à l’API distante via REST ou Socket.IO.

À privilégier pour :

- un backend Feathers déjà déployé ;
- une architecture frontend/backend séparée ;
- une API partagée par plusieurs applications ;
- un SSO ou un réseau d’entreprise centralisé.

## Ce qui ne change pas

Les composants Vue utilisent toujours le client Feathers :

```ts
const service = useService('articles')
const rows = await service.find({ query: { $limit: 25 } })
```

Les services NFZ du Builder suivent le même principe avec `useBuilderClient()`.

## Choisir un transport

| Transport | Cas courant |
|---|---|
| REST | opérations HTTP classiques, proxies stricts, diagnostics simples |
| Socket.IO | événements temps réel, reconnexion et services interactifs |

Le transport est une question d’accès. Le contrat métier reste un service Feathers.

<!-- release-version: 6.5.41 -->
