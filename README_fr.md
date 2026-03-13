# nuxt-feathers-zod

[Documentation](https://vevedh.github.io/nuxt-feathers-zod/)

`nuxt-feathers-zod` est un module officiel **Nuxt 4** qui embarque ou connecte **FeathersJS v5 (Dove)** avec une approche **CLI-first** et une génération de services **Zod-first** en option.

Il prend en charge deux modes principaux :

- **mode embedded** : un serveur Feathers s’exécute dans Nuxt/Nitro
- **mode remote** : une application Nuxt utilise un client Feathers vers une API externe

## Périmètre open source

Le module OSS public inclut :

- intégration Nuxt 4 + Nitro
- modes embedded et remote
- transports REST et Socket.IO
- serveur embedded avec **Express** ou **Koa**
- bootstrap CLI pour `init embedded`, `init remote`, `init templates`
- génération CLI pour services, services distants, middlewares et modules serveur
- modes de schéma `none | zod | json`
- flux d’authentification locale/JWT
- pont SSO Keycloak pour le mode remote
- support Swagger legacy optionnel
- surcharge de templates
- surface optionnelle de gestion MongoDB via `database.mongo.management`
- helpers côté client avec support Pinia / feathers-pinia

## Installation

```bash
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
```

Dépendances Swagger optionnelles :

```bash
bun add feathers-swagger swagger-ui-dist
```

## Démarrage rapide — mode embedded

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Mode embedded avec authentification locale

```bash
bunx nuxi@latest init my-nfz-auth
cd my-nfz-auth
bun install
bun add nuxt-feathers-zod feathers-pinia feathers-swagger swagger-ui-dist
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force --auth --swagger
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod --collection users --idField _id --docs
bun dev
```

## Démarrage rapide — mode remote

```bash
bunx nuxi@latest init my-nfz-remote
cd my-nfz-remote
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --force
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
bun dev
```

## Commandes CLI canoniques

```bash
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport rest --force
bunx nuxt-feathers-zod add service users --adapter mongodb --schema zod --collection users --idField _id
bunx nuxt-feathers-zod add service users --auth --authAware --schema zod --adapter mongodb --collection users --idField _id
bunx nuxt-feathers-zod add service actions --custom --methods find --customMethods run,preview
bunx nuxt-feathers-zod add remote-service users --path users --methods find,get
bunx nuxt-feathers-zod add middleware trace-headers --target nitro
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod doctor
```

## Génération auth-aware pour `users`

Pour le service `users`, `--auth` et `--authAware` couvrent deux besoins distincts :

- `--auth` protège les méthodes du service avec des hooks JWT
- `--authAware` active une gestion du mot de passe compatible avec l’authentification locale

Lorsqu’on génère `users --auth`, la CLI applique par défaut un comportement **auto-safe** et active le mode auth-aware tant qu’il n’est pas explicitement désactivé.

La génération auth-aware garantit une gestion cohérente du mot de passe sur `schema=none|zod|json` et `adapter=memory|mongodb` :

- hash du champ `password` avec `passwordHash({ strategy: 'local' })`
- suppression du champ `password` dans les enregistrements/résultats retournés
- persistance de l’état `authAware` dans le manifest du service

Exemples :

```bash
bunx nuxt-feathers-zod add service users --auth --schema none --adapter memory --force
bunx nuxt-feathers-zod add service users --auth --schema zod --adapter mongodb --collection users --idField _id --force
bunx nuxt-feathers-zod add service users --auth --authAware false --schema json --adapter memory --force
```

## Surface optionnelle de gestion MongoDB

Le cœur OSS peut exposer une couche optionnelle de gestion MongoDB à partir du template généré `feathers/server/mongodb.ts`, basé sur `feathers-mongodb-management-ts`.

Exemple :

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
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
          exposeCollectionCrud: true,
        },
      },
    },
  },
})
```

Cela ajoute une couche de gestion contrôlée et opt-in pour :

- `/mongo/databases`
- `/mongo/<db>/collections`
- `/mongo/<db>/<collection>`

## Protéger un service existant après génération

```bash
bunx nuxt-feathers-zod auth service users --enabled true
bunx nuxt-feathers-zod auth service users --enabled false
```

## Générer un fichier Docker Compose MongoDB local

```bash
bunx nuxt-feathers-zod add mongodb-compose
bunx nuxt-feathers-zod add mongodb-compose --out docker-compose-db.yaml --database app --rootPassword secret --force
```

## Notes

- Convention recommandée : `servicesDirs: ['services']`
- Parcours recommandé : **CLI-first**
- Des alias historiques peuvent rester supportés pour compatibilité ascendante, mais la documentation publique met en avant uniquement les commandes canoniques
- Les procédures de publication et d’administration réservées au mainteneur restent dans `README_private.md` et sont volontairement exclues de la surface publique du dépôt

## Licence

MIT
