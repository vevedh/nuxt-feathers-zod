---
editLink: false
---
# MongoDB management

Cette page remplace l’ancien contenu de maintien de navigation par une explication opérationnelle de l’option `database.mongo.management` pour exposer une surface d’administration MongoDB. Elle est destinée aux développeurs qui veulent comprendre l’option, l’activer dans `nuxt.config.ts` et vérifier son comportement dans un projet Nuxt 4.

## Objectif

L’option `database.mongo.management` permet d’exposer une surface d’administration MongoDB et de garder une architecture cohérente entre le module Nuxt, le runtime Feathers, les services générés, le client TypeScript et le CLI. L’exemple ci-dessous donne une base directement réutilisable.

## Quand utiliser cette option ?

Utilise cette page lorsque tu veux :

- configurer précisément l’option `database.mongo.management` pour exposer une surface d’administration MongoDB ;
- documenter le choix dans un starter ou une application ;
- tester rapidement le comportement avec une commande CLI ;
- éviter les divergences entre configuration, fichiers générés et runtime.

## Exemple de configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:changeMe@127.0.0.1:27037/app?authSource=admin',
        management: {
          enabled: true,
          basePath: '/mongo',
          auth: true,
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeCollectionCrud: true,
          allowInsertDocuments: false,
          allowPatchDocuments: false,
          allowRemoveDocuments: false,
        },
      },
    },
  }
})
```

## Exemple CLI

```bash
bunx nuxt-feathers-zod mongo management --basePath /mongo --auth true
```

## Exemple d’utilisation

```txt
GET /mongo/databases
GET /mongo/:db/collections
GET /mongo/:db/:collection/documents
GET /mongo/:db/:collection/schema
POST /mongo/:db/:collection/aggregate
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
