# Architecture

## Objectif

Le module réduit la duplication entre une application Nuxt et son backend Feathers. En mode embedded, l’application Feathers vit dans Nitro. En mode remote, Nuxt conserve le même modèle client et se connecte à un backend externe.

## Responsabilités

### Nuxt

Nuxt porte :

- l’interface Vue ;
- le SSR ;
- les plugins client ;
- les auto-imports de composables ;
- la configuration de l’application.

### Nitro et H3

Nitro porte :

- le serveur Nuxt ;
- le cycle de vie de l’application ;
- les middleware d’infrastructure ;
- les endpoints strictement liés à l’hébergement HTTP ;
- le branchement du runtime Feathers via `@vevedh/feathers-nitro`.

### Feathers

Feathers porte :

- les services métier ;
- les méthodes standard et personnalisées ;
- les hooks ;
- l’authentification ;
- l’autorisation ;
- les événements ;
- REST et Socket.IO.

### Zod

Zod porte la validation et la description des données lorsque `schema: zod` est choisi.

## API Feathers-first

Une fonctionnalité métier doit être modélisée comme un service :

```ts
const service = app.service('articles')
const result = await service.find({ query: { $limit: 20 } })
```

Le client utilise le même chemin :

```ts
const articles = useService('articles')
await articles.find({ query: { $limit: 20 } })
```

Le Builder suit cette règle avec les services `nfz/*`.

## Instance runtime

La 6.5.x maintient une instance runtime `default` typée. Son état peut être :

- `initializing` ;
- `ready` ;
- `failed` ;
- `closing` ;
- `closed`.

Les bridges attendent la promesse `ready`. Une initialisation échouée ne doit pas être masquée par un faux `404`.

## Secrets

Les secrets MongoDB et Keycloak sont résolus au runtime. Ils ne doivent pas être sérialisés dans les templates générés, `.nuxt` ou `.output`.

## Compatibilité Nitro historique

Lorsque :

```ts
feathers: {
  console: {
    enabled: true,
    legacyNitroRoutes: true,
  },
}
```

les anciennes routes `/api/nfz/**` sont enregistrées comme façades minces. Elles délèguent aux services Feathers `nfz/*` et sont marquées comme dépréciées.

Pour une nouvelle application :

```ts
feathers: {
  console: {
    enabled: true,
    legacyNitroRoutes: false,
  },
}
```

<!-- release-version: 6.5.41 -->
