# nuxt-feathers-zod

`nuxt-feathers-zod` intègre FeathersJS v5 (Dove), les schémas Zod et l'accès typé aux services dans Nuxt 4.
Le module s'adresse aux applications qui ont besoin d'un vrai contrat backend dans un projet Nuxt, tout en conservant la possibilité de se connecter à une API Feathers externe.

Version de référence : **6.8.0**.

Socle runtime de la version `6.8.0` : Node.js `^22.19.0 || ^24.11.0 || >=26.0.0` et Bun `>=1.3.6` (validation de release recommandée avec Bun 1.3.14).
Le pont Nitro embarqué utilise `@vevedh/feathers-nitro@0.6.0` avec FeathersJS 5.0.49, Nuxt 4.5.2 et Vue 3.5.42 ; Nitro 2.13.4 et H3 1.15.11 restent volontairement gelés sur ce train.


## Ce que fournit le module

- Serveur Feathers embarqué dans Nuxt/Nitro.
- Mode client remote vers un backend Feathers existant.
- Génération de services par CLI, avec stratégies d’identifiant portables `objectid`, UUID, entier, bigint décimal sous forme de chaîne et chaîne libre.
- Schémas Zod, resolvers, validation de requêtes et types TypeScript.
- Registre extensible de providers local, JWT, OIDC, clé API et custom, avec flux remote orientés Keycloak.
- Transports REST et Socket.io.
- Connexions nommées MongoDB et Knex (PostgreSQL, MySQL, MariaDB, SQLite et Microsoft SQL Server), avec drivers SQL explicites, pools sûrs, transactions mono-connexion, diagnostics expurgés et endpoints optionnels d'administration MongoDB. MongoDB, PostgreSQL, MySQL, MariaDB, SQLite et MSSQL sont certifiés par des gates réelles sur le candidate exact ; la certification MSSQL utilise SQL Server 2025 avec `tedious`, une base/un schéma isolés et un teardown lié au SHA du candidate.
- Fondation de cache natif serveur (`feathers.cache`) avec provider `memory` borné, TTL, namespaces, fail-open, `getOrSet` single-flight et diagnostics sans contenu. Redis reste une intégration applicative Nitro/Unstorage dans Patch073 r1.
- Services Builder et diagnostic Feathers-first sous `nfz/*`.
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
      providers: {
        local: {
          type: 'local',
          usernameField: 'email',
          passwordField: 'password',
        },
        jwt: { type: 'jwt' },
      },
    },
  },
})
```

## Initialisation recommandée

Il faut utiliser la CLI officielle plutôt que créer manuellement les dossiers de service.

```bash
bunx nuxt-feathers-zod init embedded --auth --framework express
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --schema zod
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
bunx nuxt-feathers-zod doctor
```

La CLI écrit le manifeste `services/.nfz/manifest.json`, génère les fichiers de service et conserve les conventions attendues par le scanner runtime du module.

## Exemples

Le dépôt propose désormais une progression d’exemples maintenus dans [`examples/`](./examples/) :

- `minimal-embedded-memory` — plus petit exemple Feathers embedded + Zod, sans base de données ;
- `nfz-quasar-unocss-pinia-starter` — starter complet Nuxt 4 + Quasar 2 + Pinia + MongoDB + auth locale ;
- `real-world-nuxt4-daisyui-pinia-redis` — Nuxt 4 + DaisyUiKit + Pinia + MongoDB + local/JWT + RBAC + cache Redis ;
- `remote-rest-minimal` — client REST remote vers un backend Feathers existant ;
- `sql-knex-named-connections` — recette de connexions nommées PostgreSQL/MySQL/MariaDB ;
- références SPA/SSR Keycloak + LDAP pour les intégrations SSO.

Commence par [`examples/README.md`](./examples/README.md) pour choisir le parcours le plus petit correspondant à ton besoin.

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
  password: '<user-password>',
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
const databases = await builder.getDatabaseConnections()
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
3. Valider les noms de providers, l’issuer/audience OIDC et les scopes des clés API.
4. Configurer `NFZ_AUTH_SECRET` ou des clés de signature asymétriques ; les valeurs non sûres sont refusées en production.
5. Désactiver les actions destructives MongoDB management sauf besoin explicite.
6. Construire l'application et exécuter au moins un scénario d'authentification et un scénario de service protégé.

## Licence

MIT
