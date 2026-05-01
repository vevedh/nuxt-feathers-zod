# Services

Les services sont le cœur de l’intégration Feathers dans `nuxt-feathers-zod`.

NFZ privilégie une approche **CLI-first** : le CLI génère les fichiers attendus et garde la structure cohérente avec le runtime, les schémas, les hooks et le client.

## Structure standard

```txt
services/<name>/
├─ <name>.ts
├─ <name>.class.ts
├─ <name>.schema.ts
└─ <name>.shared.ts
```

| Fichier | Rôle |
|---|---|
| `<name>.ts` | Enregistrement du service dans l’app Feathers |
| `<name>.class.ts` | Classe/service Feathers |
| `<name>.schema.ts` | Schémas, validators, resolvers |
| `<name>.shared.ts` | Déclaration client partagée |

## Service mémoire

```bash
bunx nuxt-feathers-zod add service messages \
  --adapter memory \
  --schema zod
```

Usage recommandé :

- prototypes ;
- tests ;
- services temporaires ;
- données non persistantes.

## Service MongoDB

```bash
bunx nuxt-feathers-zod add service users \
  --adapter mongodb \
  --collection users \
  --schema zod \
  --idField _id
```

Configuration MongoDB :

```ts
export default defineNuxtConfig({
  feathers: {
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
      },
    },
  },
})
```

## Service custom

```bash
bunx nuxt-feathers-zod add service actions \
  --custom \
  --methods find,get \
  --customMethods run,preview
```

Exemple d’appel :

```ts
const { $api } = useNuxtApp()

await $api.service('actions').run({
  action: 'preview',
  payload: {
    service: 'users',
  },
})
```

## Service upload/download

```bash
bunx nuxt-feathers-zod add file-service assets \
  --path api/v1/assets \
  --storageDir storage/assets \
  --auth true
```

Conseils :

- limite la taille des fichiers ;
- contrôle l’extension et le MIME type ;
- stocke les métadonnées utiles ;
- protège le service en production.

## Service distant

```bash
bunx nuxt-feathers-zod add remote-service users \
  --path users \
  --methods find,get,create,patch,remove
```

En remote, le service est déclaré côté client. NFZ ne génère pas de classe serveur locale.

## Schémas

```bash
bunx nuxt-feathers-zod schema users --show
bunx nuxt-feathers-zod schema users --set-mode zod
bunx nuxt-feathers-zod schema users --add-field "email:string!"
```

Modes disponibles :

| Mode | Effet |
|---|---|
| `none` | Pas de validation générée |
| `zod` | Validation Zod et types TypeScript |
| `json` | JSON Schema/AJV |

## Auth par service

```bash
bunx nuxt-feathers-zod auth service users --enabled true
```

Pour un service `users` utilisé par l’auth locale, privilégie :

```bash
bunx nuxt-feathers-zod add service users \
  --adapter mongodb \
  --schema zod \
  --auth true
```

## Bonnes pratiques

- Garde un service par responsabilité métier.
- Évite de mélanger CRUD générique et actions métier complexes.
- Utilise les méthodes custom pour les workflows (`run`, `preview`, `import`).
- Active Zod sur les services exposés.
- Ne modifie pas à la main les fichiers générés si le manifest NFZ pilote le service.
