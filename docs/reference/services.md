# Services

Les services sont le cœur du module. Ils exposent les méthodes Feathers et portent le contrat métier de l'application.

## Création recommandée

```bash
bunx nuxt-feathers-zod add service articles --adapter mongodb --schema zod
```

La génération CLI crée une structure cohérente avec le scanner du module et met à jour le manifeste `.nfz`.

## Méthodes standard

Un service Feathers peut exposer :

- `find` ;
- `get` ;
- `create` ;
- `update` ;
- `patch` ;
- `remove`.

Les méthodes réellement disponibles dépendent du service généré et des options choisies.

## Méthodes personnalisées

```bash
bunx nuxt-feathers-zod add custom-service reports --methods find,run --customMethods run
```

Les méthodes custom doivent être déclarées côté service et côté client. Cela évite les erreurs de transport, en particulier entre SSR, REST et Socket.io.

## Schémas

Le mode recommandé est `zod` pour les services métier.

```bash
bunx nuxt-feathers-zod add service tasks --schema zod
```

Le module supporte aussi des modes plus légers selon les besoins :

- `none` pour un service minimal ;
- `json` pour une description orientée JSON ;
- `zod` pour un contrat TypeScript et runtime plus robuste.

## Hooks

Les hooks Feathers doivent être utilisés pour :

- l'authentification ;
- les règles RBAC ;
- la validation métier ;
- l'enrichissement des données ;
- l'audit ;
- les événements métier.

```ts
export default {
  before: {
    all: [],
    find: [],
    create: [],
  },
  after: {
    all: [],
  },
  error: {
    all: [],
  },
}
```

## Bonnes pratiques

- Générer les services avec la CLI.
- Garder les hooks proches du service.
- Définir clairement les méthodes exposées.
- Masquer les champs sensibles dans les resolvers externes.
- Versionner le manifeste `.nfz`.
- Préférer des composables ou stores métier pour les pages sensibles.
