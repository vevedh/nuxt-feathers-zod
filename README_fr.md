
## 6.4.135
- Fix generated server app template syntax in `src/runtime/templates/server/app.ts` so playground/dev build no longer fails with `Unexpected "const"` in `.nuxt/feathers/server/app.ts`.

> Note de correctif la plus récente : v6.4.132 fait de `app.get('mongoPath')` la source de vérité unique du routage Mongo admin embedded.

> Depuis la 6.4.133, les valeurs par défaut de l'auth locale repassent à `userId/password` afin de rester alignées avec la base actuelle CLI/playground NFZ et les services auth-ready générés dans ce dépôt.

> Depuis la 6.4.127, `useAuthRuntime()` récupère aussi le jeton depuis le stockage du client d’authentification Feathers après `authenticate()`/`reAuthenticate()` si la réponse ne renvoie pas `accessToken` directement, afin que les helpers REST protégés envoient bien `Authorization`.

> Note préparation soumission Nuxt : les métadonnées npm, le wording README et le brouillon de listing communautaire ont été alignés en `6.4.137`.

# nuxt-feathers-zod

[Documentation](https://vevedh.github.io/nuxt-feathers-zod/)

`nuxt-feathers-zod` est un module Nuxt pour **FeathersJS v5 (Dove)** avec une approche **CLI-first** et une génération de services **Zod-first** en option.

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

## Créer d'abord l'application Nuxt 4

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
```

> Pour travailler dans le dépôt du module lui-même, préfère `bun run clean:repo && bun install` à `bunx nuxi cleanup` avant l’installation des dépendances.

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

NFZ standardise désormais l’auth locale embedded autour de `userId/password` par défaut. Depuis `6.4.123`, le module expose aussi la cartographie des champs d’auth locale côté runtime public dans `runtimeConfig.public._feathers.auth.local`, ce qui évite aux formulaires consommateurs de devoir deviner s’il faut envoyer `userId`, `email` ou un autre champ. Cette cartographie est maintenant aussi injectée correctement côté serveur Feathers avant la création de `AuthenticationService`, via le pattern documenté `app.set('authentication', config)`.


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

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

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

## Starter upload/download de fichiers

```bash
bunx nuxt-feathers-zod add file-service assets --path api/v1/assets --storageDir storage/assets
```

Ce scaffold génère un service local lisible avec `find`, `get`, `remove`, `upload` et `download`.

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

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

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

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

## Surface optionnelle de gestion MongoDB

Le cœur OSS peut exposer une couche optionnelle de gestion MongoDB à partir du template généré `feathers/server/mongodb.ts`, basé sur `feathers-mongodb-management-ts`.

Le runtime MongoDB embedded expose :
- `app.get('mongodbClient')` → `Promise<Db>` pour les services Feathers Mongo générés
- `app.get('mongodbDb')` → instance `Db` courante
- `app.get('mongodbConnection')` → connexion brute `MongoClient`

Quand `database.mongo.management.auth.userProperty` est personnalisé, le logger d’audit généré résout désormais cette même propriété pour rester cohérent avec la protection des routes.

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


## Flux recommandé dans le repo du module

Quand tu travailles directement dans le **repo du module**, préfère :

```bash
bun run clean:repo
bun install
```

et évite `bunx nuxi cleanup` avant installation des dépendances.

## Notes

- Convention recommandée : `servicesDirs: ['services']`
- Parcours recommandé : **CLI-first**
- Des alias historiques peuvent rester supportés pour compatibilité ascendante, mais la documentation publique met en avant uniquement les commandes canoniques
- Les procédures de publication et d’administration réservées au mainteneur restent dans `README_private.md` et sont volontairement exclues de la surface publique du dépôt

## Licence

MIT


## Démos produit

Pour rendre NFZ plus lisible à adopter, la trajectoire recommandée est de montrer quatre démos courtes :

- **auth demo** : login / logout / reAuthenticate / inspection user
- **CRUD demo** : create / list / patch / remove sur un vrai service
- **diagnostics demo** : timeline, filtres, export JSON, résumé runtime
- **services manager demo** : manifest, preview, dry-run, apply


## Builder Studio et presets (6.4.62)

NFZ documente désormais un parcours builder plus démontrable :

- presets officiels (`mongoCrud`, `mongoSecureCrud`, `memoryCrud`, `action`)
- page de démonstration dédiée dans l’app de test
- routage direct vers `/services-manager?preset=...`
- aperçu plus clair du layout NFZ avant apply


## Builder Studio 6.4.63

- barrels optionnels : `index.ts` dans le dossier service, et en option `services/index.ts`
- starter `users` rapproché des conventions NFZ local auth (`passwordHash`, masquage du mot de passe côté external resolver)
- apply builder plus proche d’un layout de démonstration CLI-first


## 6.4.64

- Builder Studio: `services/index.ts` peut maintenant être agrégé à partir de plusieurs services marqués `service+root`.
- Le preview et l'apply utilisent la liste complète du manifest pour produire un root barrel cohérent avec plusieurs services.


## 6.4.65
Le parcours **Services Manager** distingue désormais plus clairement les services **Démo builder**, les **Services scannés** et les **Brouillons libres**, afin de rendre les tests simples plus compréhensibles dans l'app de démonstration.

## 6.4.66

- Builder Studio : les **presets officiels** sortent du flux long du formulaire et passent dans un **onglet dédié `Presets`** pour rester visibles et accessibles sans scroll important.
- Les **starters métier** sont présentés dans ce même espace pour des tests simples et compréhensibles.


## 6.4.67

- Builder Studio : filtre rapide **Tous / Démo / Scannés / Brouillons** dans le sidebar pour isoler les familles de services.
- Onglet `Presets` : zone presets/starters désormais scrollable localement avec `max-h-[56vh] overflow-auto`.

## 6.4.68

- Builder Studio : nouveaux **modes de vue** pédagogiques pour rendre l'écran plus lisible dès la première utilisation :
  - `Tests rapides`
  - `Services réels`
  - `Builder avancé`
- Ces modes pilotent le focus du builder (démos builder vs services scannés vs workflow complet).

## 6.4.69

- Services Manager ajoute trois cartes d’entrée guidées : tests rapides, services réels et builder avancé.
- Le parcours devient plus lisible avant même d’ouvrir les onglets Workflow / Presets / Workspace.


## NFZ Studio Docker Edition

Le dashboard de démonstration associé au module peut désormais être packagé comme **produit Docker** avec :
- `NFZ_DATA_DIR` pour la persistance du manifest builder et des diagnostics
- `NFZ_WORKSPACE_DIR` pour le scan et l'apply du builder sur un workspace monté
- `NFZ_BUILDER_APPLY_MODE` (`workspace`, `export-only`, `readonly`)
- un scaffold licence exposé via `/api/license/status` et une page dashboard `/license`
- `Dockerfile`, `docker-compose.yaml` et `.env.example` prêts à l'emploi dans l'app de test

> Note : la couche licence incluse à ce stade est un **scaffold UX/runtime**. Elle prépare l'édition Docker licenciée, mais ne remplace pas encore une signature cryptographique serveur/public key.


## License Center

La Docker Edition peut exposer une page réutilisable `License Center` et des composants de feature gating pour piloter les futures options sous licence de la surface produit `nuxt-feathers-zod`.


## 6.4.87 — License Center layout clarity
- La page /license-center côté dashboard de démonstration a été refondue pour une lecture plus claire et sans écrasement responsive.
- Nouveau découpage : status + quick actions + runtime summary en haut, puis onglets Overview / Features / Plans.
- Le breakpoint de colonnes latérales a été repoussé à 2xl pour éviter les défauts de mise en page sur desktop intermédiaire.


## PATCH 6.4.93 refonte auth runtime (phase 2)

- Ajout des helpers officiels pour les surfaces protégées : `useAuthenticatedRequest()` et `useProtectedService()`.
- Ajout de `useAuthDiagnostics()` et `getStateSnapshot()` pour faciliter le diagnostic auth.
- Le plugin client généré synchronise désormais les résultats `authenticate` / `reAuthenticate` remote avec le runtime auth unifié, au lieu de ne mettre à jour qu’un store Pinia.
- Documentation FR/EN alignée sur le runtime auth unifié, les requêtes protégées, les services protégés et le bridge Keycloak.
- Règle recommandée : les outils NFZ protégés ne doivent plus reconstruire les headers Bearer à la main et doivent consommer les helpers runtime.


## Helpers runtime auth unifiés

La version `6.4.94` ajoute une phase 3 plus robuste pour les flux REST/services protégés :

- `useAuthRuntime()` reste la source de vérité unique
- la métadonnée des champs d’auth locale embedded est exposée publiquement sous `_feathers.auth.local`
- `buildLocalAuthPayload()` permet de construire un payload `strategy: 'local'` à partir de ces champs
- l’auth embedded côté serveur applique désormais bien la config résolue `authentication.local` via `app.set('authentication', config)` avant l’instanciation de `AuthenticationService`, donc `usernameField` / `entityUsernameField` sont réellement honorés au runtime
- `useAuthBoundFetch()` fournit un fetch authifié avec injection automatique du bearer et une relance unique après `reAuthenticate()` en cas de 401
- `useAuthenticatedRequest()` délègue maintenant à ce helper
- `useProtectedService()` retente une fois après `reAuthenticate()` sur 401
- les clients Feathers REST générés utilisent désormais ce fetch authifié par défaut

Ceci est particulièrement utile pour le mode embedded REST, le mode remote JWT et le bridge Keycloak SSO où un même token doit être propagé de façon cohérente entre services Feathers et routes HTTP protégées.


## 6.4.95

- auth runtime refactor phase 4
- official protected tool helpers: `useProtectedTool()` and `useMongoManagementClient()`
- public runtime metadata for embedded Mongo management routes
- better alignment between protected Feathers services and protected runtime tool HTTP routes

## 6.4.96

- phase 5 de la refonte auth runtime : bridge Keycloak officiel `useKeycloakBridge()`
- diagnostics runtime enrichis (`lastBridgeAt`, `lastEnsureReason`, `bridgePath`, `clientSync`)
- `useAuthBoundFetch()` et `useProtectedService()` déclenchent désormais une validation explicite du bearer Keycloak avant appel protégé

> En mode embedded, les routes Mongo management passent derrière le préfixe REST embarqué. Exemple : path REST `/feathers` + base path Mongo `/mongo` donne des appels client vers `/feathers/mongo/...`.


## Nettoyage du dépôt du module

Dans le dépôt du module lui-même, préfère `bun run clean:repo` avant `bun install`. Exécuter `bunx nuxi cleanup` avant l'installation des dépendances peut échouer car `@nuxt/kit` n'est pas encore disponible.
## 6.4.109 — Helper admin diagnostics/devtools

`useNfzAdminClient()` est maintenant disponible pour consommer les surfaces diagnostics et DevTools NFZ via le même chemin runtime auth-aware que Mongo management.


- 6.4.117: fixed invalid YAML front matter in `docs/en/guide/auth-keycloak.md`; added GitHub Pages/VitePress deployment note (`docs/guide/github-pages.md`).

## 6.4.121

- Documentation clarifiée : chaque exemple utilisant `--adapter mongodb` rappelle maintenant qu'une base MongoDB active est nécessaire, et qu'on peut générer rapidement un `docker-compose.yaml` avec `bunx nuxt-feathers-zod add mongodb-compose`.

> Note transport (6.4.129) : dans les clients générés, `transport: 'auto'` est maintenant résolu de façon déterministe. En mode embedded navigateur, REST est préféré ; en mode remote, Socket.IO est préféré quand il est disponible, sinon REST.


### Mongo admin authentication bridge

Mongo management routes now use the standard Feathers `authenticate(...)` hook before `requireMongoAdmin(...)`. This keeps Mongo admin aligned with the authentication pipeline used by regular protected Feathers services while preserving the dedicated Mongo admin authorization layer. Mongo management auth also exposes `authStrategies` (default `['jwt']`).
