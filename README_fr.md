# nuxt-feathers-zod

`nuxt-feathers-zod` intègre FeathersJS v5 (Dove), les schémas Zod et l'accès typé aux services dans Nuxt 4.
Le module s'adresse aux applications qui ont besoin d'un vrai contrat backend dans un projet Nuxt, tout en conservant la possibilité de se connecter à une API Feathers externe.

Version de référence : **6.5.30**.

## Ce que fournit le module

<<<<<<< HEAD
- Serveur Feathers embarqué dans Nuxt/Nitro.
- Mode client remote vers un backend Feathers existant.
- Génération de services par CLI.
- Schémas Zod, resolvers, validation de requêtes et types TypeScript.
- Authentification locale/JWT et flux remote orientés Keycloak.
- Transports REST et Socket.io.
- Support MongoDB et endpoints optionnels d'administration MongoDB.
- Composables runtime pour le client, les services, l'authentification et les services protégés.
- Documentation VitePress en français et en anglais.
=======
## Ce que c’est

`nuxt-feathers-zod` aide à construire ou consommer un backend FeathersJS depuis une application Nuxt 4 avec un workflow cohérent module + CLI.

Le module supporte deux modes principaux :

- **embedded** — un serveur Feathers tourne dans Nuxt/Nitro
- **remote** — une application Nuxt utilise un client Feathers typé vers une API externe

## À quoi il sert

NFZ est adapté si tu veux :

- une **architecture backend-first native à Nuxt**
- des services Feathers générés par une **CLI déterministe**
- des types partagés et des schémas **Zod-first** en option
- des flux **auth locale/JWT** ou une intégration **Keycloak SSO**
- des helpers côté client pour **Pinia / store session**
- un **starter Quasar + UnoCSS + Pinia** officiel avec MongoDB, auth seedée et RBAC
- un chemin vers la **gestion MongoDB**, les diagnostics et le builder tooling

## Ce que le module OSS inclut

- intégration Nuxt 4 + Nitro
- modes embedded et remote
- transports REST et Socket.IO
- serveur embedded avec Express ou Koa
- bootstrap CLI pour projets embedded et remote
- génération CLI pour services, services distants, middlewares et server modules
- modes de schéma `none | zod | json`
- auth locale/JWT
- pont Keycloak pour le mode remote
- support Swagger legacy optionnel
- template overrides
- surface optionnelle de gestion MongoDB via `database.mongo.management`
- template starter officiel sous `examples/nfz-quasar-unocss-pinia-starter`
- contrôles de release avec build, typecheck, E2E et smoke tarball

## Starter applicatif principal

Pour une application Nuxt 4 complète avec Quasar 2, UnoCSS, Pinia, MongoDB, auth locale seedée, middleware route, RBAC et couche d’accès Feathers encapsulée :

```bash
bunx nuxt-feathers-zod init starter --preset quasar-unocss-pinia-auth --dir nfz-starter
cd nfz-starter
bun install
cp .env.example .env
bun run db:up
bun dev
```

Le starter est documenté dans `docs/guide/starter-quasar-unocss-pinia.md` et maintenu sous `examples/nfz-quasar-unocss-pinia-starter`.


## Parcours application métier Nuxt 4 + Quasar

Pour un portail métier ou un dashboard admin comme Portail COSCA / Portail Comité, le chemin recommandé n’est pas une installation minimale suivie de fichiers de services écrits à la main. Pars du starter officiel Quasar + UnoCSS + Pinia, puis étends-le service par service.

Le guide d’intégration réelle documente maintenant :

- l’alignement complet `nuxt.config.ts` pour NFZ 6.5.x ;
- `nuxt-quasar-ui` plutôt qu’un plugin Quasar manuel ;
- le fichier obligatoire `services/users/users.schema.ts` et la classe runtime `User` ;
- `passwordHash({ strategy: 'local' })` dans le resolver Zod ;
- `userExternalResolver` pour masquer `password` ;
- `useNfzAuth()` comme façade auth UI canonique ;
- les middlewares admin/member et hooks RBAC ;
- la migration des seeds Pinia/localStorage vers des services MongoDB.

À lire :

- Guide intégration réelle : `docs/guide/real-world-nuxt4-quasar-app.md`
- Guide migration : `docs/guide/migrate-existing-nuxt4-app.md`
- Checklist intégration : `docs/guide/real-world-integration-checklist.md`
- Snippets : `examples/real-world-nuxt4-quasar-nfz/snippets/`

## Parcours embedded 5 minutes

```bash
bunx nuxi@latest init my-nfz-app
cd my-nfz-app
bun install
bun add nuxt-feathers-zod @pinia/nuxt pinia
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service users
bun dev
```

## Règles recommandées

1. **Initialise d’abord le module.**
2. **Génère les services via la CLI.**
3. **Ne crée pas à la main les premiers fichiers de service.**
4. **Garde `feathers.servicesDirs = ['services']` sauf raison documentée.**

Ces quatre règles évitent la plupart des problèmes de scan, d’entité auth et d’exports incohérents.
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb

## Installation

```bash
bun add nuxt-feathers-zod
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: {
      rest: { enabled: true, path: '/feathers' },
      websocket: { enabled: true },
    },
    auth: {
      enabled: true,
      strategies: ['local', 'jwt'],
    },
  },
})
```

## Initialisation recommandée

Il faut utiliser la CLI officielle plutôt que créer manuellement les dossiers de service.

```bash
bunx nuxt-feathers-zod init embedded --auth --database mongodb
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
bunx nuxt-feathers-zod doctor
```

La CLI écrit le manifeste `services/.nfz/manifest.json`, génère les fichiers de service et conserve les conventions attendues par le scanner runtime du module.

<<<<<<< HEAD
## Utilisation runtime
=======
- Quick start embedded : `docs/guide/getting-started.md`
- Starter principal Quasar + UnoCSS + Pinia : `docs/guide/starter-quasar-unocss-pinia.md`
- App métier Nuxt 4 + Quasar : `docs/guide/real-world-nuxt4-quasar-app.md`
- Mode remote : `docs/guide/remote.md`
- Auth locale : `docs/guide/auth-local.md`
- Keycloak SSO : `docs/guide/keycloak-sso.md`
- Starter upload/download : `docs/guide/file-upload-download.md`
- Dépannage : `docs/guide/troubleshooting.md`
- Workflow de publication : `docs/guide/publishing.md`
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb

```vue
<script setup lang="ts">
const articles = useService('articles')

const { data } = await useAsyncData('articles', async () => {
  return await articles.find({
    query: { $limit: 20, $sort: { createdAt: -1 } },
  })
})
</script>

<template>
  <pre>{{ data }}</pre>
</template>
```

L'authentification est exposée par `useAuth()` et `useAuthRuntime()`.

```ts
const auth = useAuth()

await auth.authenticate({
  strategy: 'local',
  email: 'admin@example.local',
  password: 'change-me',
})
```

## Modes embedded et remote

### Mode embedded

Le mode embedded est adapté lorsque l'application Nuxt porte le backend.
L'application Feathers est créée dans la couche serveur Nuxt/Nitro, les services sont scannés depuis `servicesDirs`, et l'application peut exposer les transports REST et Socket.io.

### Mode remote

Le mode remote est adapté lorsque le backend Feathers existe déjà.
L'application Nuxt initialise un client Feathers, se connecte à l'URL configurée et conserve les mêmes composables d'accès aux services.

```bash
bunx nuxt-feathers-zod init remote --url https://api.example.com --transport socketio --auth
```

## Documentation

La documentation se trouve dans le dossier `docs/` et couvre :

- la prise en main développeur ;
- la référence CLI ;
- la référence de configuration ;
- les composables runtime ;
- les services et hooks ;
- l'authentification ;
- la préparation à la production.

Lancement local :

```bash
cd docs
bun install
bun run dev
```

## Checklist de production

Avant publication ou déploiement d'une application basée sur ce module :

1. Exécuter `bunx nuxt-feathers-zod doctor`.
2. Vérifier `feathers.servicesDirs` et le manifeste `services/.nfz/manifest.json`.
3. Valider les stratégies d'authentification et les champs de token.
4. Désactiver les actions destructives MongoDB management sauf besoin explicite.
5. Configurer les secrets runtime par variables d'environnement.
6. Construire l'application et exécuter au moins un scénario d'authentification et un scénario de service protégé.

## Licence

MIT
