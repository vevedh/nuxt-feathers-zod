# Démarrage rapide

Ce parcours crée un backend Feathers embarqué dans Nuxt 4, ajoute un service et vérifie le résultat.

## Prérequis

- Node.js conforme au champ `engines` du package ;
- Bun conforme au champ `engines.bun` ;
- un projet Nuxt 4.

## Installer le module

```bash
bun add nuxt-feathers-zod
```

Ajoutez le module :

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
```

## Initialiser le mode embedded

```bash
bunx nuxt-feathers-zod init embedded --auth --framework express
```

La commande met à jour `nuxt.config.*` sans créer une seconde API métier sous `server/api`. Les services restent des services Feathers.

## Générer un service

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter memory \
  --schema zod
```

Pour MongoDB :

```bash
bunx nuxt-feathers-zod add service articles \
  --adapter mongodb \
  --collection articles \
  --schema zod
```

La connexion MongoDB doit être configurée dans `feathers.database.mongo`. Voir [Configuration](/reference/configuration).

## Ajouter un champ de schéma

```bash
bunx nuxt-feathers-zod schema articles --add-field title:string!
bunx nuxt-feathers-zod schema articles --add-field published:boolean=false
bunx nuxt-feathers-zod schema articles --validate
```

Le suffixe `!` indique qu’un champ est requis.

## Démarrer et tester

```bash
bun run dev
```

Côté Vue :

```vue
<script setup lang="ts">
const articles = useService('articles')

const result = await articles.find({
  query: {
    $limit: 20,
    $sort: { createdAt: -1 },
  },
})
</script>
```

Le même service peut être exposé par REST ou Socket.IO selon `feathers.transports`.

## Vérifier le projet

```bash
bunx nuxt-feathers-zod capabilities
bunx nuxt-feathers-zod doctor
```

Pour le dépôt du module lui-même, utilisez aussi le [playground de validation](/guide/playground).

## Étapes suivantes

- [Architecture](/reference/architecture)
- [Services](/reference/services)
- [Configuration](/reference/configuration)
- [API client et composables](/reference/runtime)
- [Référence CLI](/reference/cli)

<!-- release-version: 6.5.49 -->
