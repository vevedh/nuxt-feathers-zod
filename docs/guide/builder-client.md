# Client Builder Feathers

`useBuilderClient()` donne accès aux outils de schéma, de manifeste et de diagnostic par les services Feathers du module. Le composable utilise le même client, la même session, les mêmes hooks et les mêmes transports que les services métier de l’application.

## Activation

```ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    console: {
      enabled: true,
      allowWrite: false,
      legacyNitroRoutes: false,
    },
  },
})
```

`console.enabled` enregistre les services `nfz/*` dans l’application Feathers avant `app.setup()`. L’option `allowWrite` reste désactivée dans cet exemple : les lectures et les prévisualisations fonctionnent, mais les modifications de fichiers sont refusées.

## Services disponibles

| Service | Méthodes | Rôle |
|---|---|---|
| `nfz/services` | `find` | Découvrir les services présents dans `servicesDirs` |
| `nfz/schemas` | `find`, `get`, `patch` | Lire, comparer ou synchroniser un schéma |
| `nfz/manifest` | `get`, `patch` | Lire ou enregistrer le manifeste NFZ |
| `nfz/builder` | `create` | Prévisualiser ou appliquer une évolution |
| `nfz/status` | `find` | Contrôler l’état de la console, de l’authentification et du RBAC |
| `nfz/rbac` | `get`, `patch` | Lire ou modifier la politique RBAC |
| `nfz/presets` | `find`, `create` | Lister, prévisualiser ou appliquer un preset |
| `nfz/init` | `create` | Lancer une initialisation autorisée |

Ces chemins sont publiés dans `runtimeConfig.public._feathers.builder.services`. Il n’est pas nécessaire de les recopier dans les composants.

## Utilisation avec le composable

```ts
const builder = useBuilderClient()

const discovery = await builder.getServices()
const manifest = await builder.getManifest()
const schema = await builder.getSchema('messages')

const preview = await builder.preview({
  service: 'messages',
  fields: {
    text: { type: 'string', required: true },
  },
})
```

Une écriture reste explicite :

```ts
await builder.saveSchema('messages', {
  fields: {
    text: { type: 'string', required: true },
    published: { type: 'boolean', required: false },
  },
})
```

Elle échoue avec une erreur Feathers `Forbidden` lorsque `console.allowWrite` vaut `false`.

## Utilisation directe du client Feathers

Le composable est une façade pratique. Les services restent accessibles directement :

```ts
const { $api } = useNuxtApp()

const schema = await $api
  .service('nfz/schemas')
  .get('messages')

const result = await $api
  .service('nfz/builder')
  .create({
    action: 'preview',
    service: 'messages',
    fields: schema.fields,
  })
```

Le même contrat fonctionne avec le transport REST ou Socket.IO. Côté serveur, l’application peut appeler directement `app.service('nfz/schemas')` sans effectuer une requête HTTP vers elle-même.

## Authentification et sécurité

Les services `nfz/*` utilisent `authenticateNfz()` et acceptent les stratégies actives résolues par le registre. Le JWT interne reste disponible pour les sessions NFZ, tandis que les providers OIDC, Keycloak ou clé API peuvent produire le même `params.principal` normalisé selon leur configuration.

Les entrées sont validées avant toute lecture ou écriture :

- identifiants de service bornés et sans traversée de chemin ;
- noms de champs filtrés ;
- clés dangereuses refusées ;
- nombre de champs limité ;
- écriture conditionnée par `console.allowWrite`.

En production, active ces services uniquement pour les administrateurs autorisés et garde `allowWrite: false` tant qu’une modification distante n’est pas indispensable.

## Compatibilité avec les anciennes routes Nitro

La branche 6.x conserve, par défaut, les anciennes routes `/api/nfz/**`. Elles ne portent plus de logique métier : chaque handler délègue au service Feathers correspondant et ajoute des en-têtes de dépréciation.

Pour une nouvelle application :

```ts
console: {
  enabled: true,
  legacyNitroRoutes: false,
}
```

Les routes de compatibilité peuvent être laissées actives pendant une migration, puis désactivées une fois tous les appels remplacés par `useBuilderClient()` ou `client.service(...)`.

<!-- release-version: 6.6.0 -->
