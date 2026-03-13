---
editLink: false
---
# MongoDB management

`nuxt-feathers-zod` peut exposer une couche **optionnelle** de gestion MongoDB à partir du template embedded `feathers/server/mongodb.ts`.

Cette capacité fait partie du **core OSS**, mais elle reste :

- désactivée par défaut,
- explicitement opt-in,
- distincte de tes services métier applicatifs.

## Options

```ts
export default defineNuxtConfig({
  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: true,
          auth: true,
          basePath: '/mongo',
          exposeDatabasesService: true,
          exposeCollectionsService: true,
          exposeUsersService: false,
          exposeCollectionCrud: true,
        },
      },
    },
  },
})
```

## Options disponibles

- `enabled`: active la couche de management
- `auth`: protège ou non cette surface
- `basePath`: préfixe REST, par défaut `/mongo`
- `exposeDatabasesService`: expose la liste des bases
- `exposeCollectionsService`: expose la liste des collections
- `exposeUsersService`: expose la gestion des utilisateurs MongoDB
- `exposeCollectionCrud`: expose des opérations CRUD sur les collections

## Positionnement recommandé

À utiliser pour :

- administration locale ou interne,
- diagnostics techniques,
- bootstrap et maintenance.

À ne pas confondre avec :

- le modèle métier de ton application,
- les services fonctionnels exposés aux utilisateurs finaux.

## Bootstrap local pratique

Pour lancer rapidement un MongoDB local compatible avec tes tests :

```bash
bunx nuxt-feathers-zod add mongodb-compose
```
