# nuxt-feathers-zod

`nuxt-feathers-zod` intègre FeathersJS v5 (Dove), les schémas Zod et l'accès typé aux services dans Nuxt 4.
Le module s'adresse aux applications qui ont besoin d'un vrai contrat backend dans un projet Nuxt, tout en conservant la possibilité de se connecter à une API Feathers externe.

Version de référence : **6.5.47**.

Socle runtime de la version `6.5.38` : Node.js `^22.12.0 || ^24.11.0 || >=26.0.0` et Bun `>=1.3.6`.
Le pont Nitro embarqué utilise désormais `@vevedh/feathers-nitro@0.5.0` ; cette version conserve le fonctionnement mono-instance existant tout en préparant une future configuration multi-instance optionnelle.


## Ce que fournit le module

- Serveur Feathers embarqué dans Nuxt/Nitro.
- Mode client remote vers un backend Feathers existant.
- Génération de services par CLI.
- Schémas Zod, resolvers, validation de requêtes et types TypeScript.
- Authentification locale/JWT et flux remote orientés Keycloak.
- Transports REST et Socket.io.
- Support MongoDB et endpoints optionnels d'administration MongoDB.
- Composables runtime pour le client, les services, l'authentification et les services protégés.
- Documentation VitePress en français et en anglais.

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

## Utilisation runtime

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

## Services Builder et diagnostic

La console enregistre les services Feathers internes de lecture de schémas, prévisualisation, manifeste et RBAC :

```ts
feathers: {
  console: {
    enabled: true,
    allowWrite: false,
    legacyNitroRoutes: false,
  },
}
```

```ts
const builder = useBuilderClient()
const schema = await builder.getSchema('articles')
```

Les anciennes routes `/api/nfz/**` restent des façades de compatibilité optionnelles. Le code neuf utilise `useBuilderClient()` ou `client.service('nfz/...')`.

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
