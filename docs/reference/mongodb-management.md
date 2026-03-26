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
          showSystemDatabases: true,
          allowCreateCollection: true,
          allowDropCollection: true,
          allowInsertDocuments: true,
          allowPatchDocuments: true,
        },
      },
    },
  },
})
```

## Options disponibles

- `enabled`: active la couche de management
- `auth`: protège ou non cette surface
- `basePath`: préfixe REST, par défaut `/mongo` (normalisé automatiquement : trim, slash initial, slash final retiré)

## Endpoints canoniques

- `GET /mongo/databases` → liste des bases
- `GET /mongo/<db>/collections` → liste des collections
- `POST /mongo/<db>/collections` → crée une collection si `allowCreateCollection: true`
- `DELETE /mongo/<db>/collections/<name>` → supprime une collection si `allowDropCollection: true`
- `GET /mongo/<db>/stats` → statistiques DB
- `GET /mongo/<db>/<collection>/indexes` → index
- `GET /mongo/<db>/<collection>/count` → nombre de documents
- `GET /mongo/<db>/<collection>/schema` → inférence simple de schéma
- `GET /mongo/<db>/<collection>/documents` → documents

Compatibilité : l’alias legacy `GET /mongo` est réécrit vers `GET /mongo/databases`.
- `exposeDatabasesService`: expose la liste des bases
- `exposeCollectionsService`: expose la liste des collections
- `exposeUsersService`: expose la gestion des utilisateurs MongoDB
- `exposeCollectionCrud`
- `whitelistDatabases` / `blacklistDatabases`
- `showSystemDatabases`: affiche aussi `admin`, `config`, `local` quand activé
- `whitelistCollections` / `blacklistCollections`
- `allowCreateDatabase` / `allowDropDatabase`
- `allowCreateCollection` / `allowDropCollection`
- `allowInsertDocuments` / `allowPatchDocuments` / `allowReplaceDocuments` / `allowRemoveDocuments`: expose des opérations CRUD sur les collections

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

## Aide CLI

Tu peux patcher `nuxt.config.*` directement depuis la CLI :

```bash
bunx nuxt-feathers-zod mongo management \
  --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin \
  --auth false \
  --basePath /mongo
```

Cette commande met à jour `feathers.database.mongo.management` et peut aussi renseigner l’URL MongoDB si elle manque.
