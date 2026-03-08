---
editLink: false
---
# Services (Zod-first)

Le parcours recommandé reste :

1. initialiser le module,
2. générer les services via la CLI,
3. ajuster ensuite les fichiers générés.

## Exemple : nouvelle app Nuxt 4 + premier service

```bash
bunx nuxi@latest init my-nfz-services
cd my-nfz-services
bun install
bun add nuxt-feathers-zod feathers-pinia
bun add -D @pinia/nuxt
bunx nuxt-feathers-zod init embedded --force
bunx nuxt-feathers-zod add service articles --adapter mongodb --collection articles --idField _id --docs
bun dev
```

## Structure attendue

```txt
services/<name>/
  <name>.ts
  <name>.class.ts
  <name>.schema.ts
  <name>.shared.ts
```

## Rôle des fichiers

- `<name>.ts` : enregistrement du service
- `<name>.class.ts` : implémentation du service
- `<name>.schema.ts` : schémas Zod / validateurs / résolveurs quand activés
- `<name>.shared.ts` : contrat client + types + comportement partagé

## Adapters supportés

### Memory

Adapter par défaut, utile pour :

- démos,
- smoke tests,
- démarrage rapide.

```bash
bunx nuxt-feathers-zod add service messages
```

### MongoDB

À utiliser quand un `mongodbClient` embedded est configuré.

```bash
bunx nuxt-feathers-zod add service users --adapter mongodb --collection users --idField _id
```

## Schémas

Par défaut, le générateur vise aujourd’hui un démarrage simple.

```bash
bunx nuxt-feathers-zod add service messages --schema none
```

Activer des schémas explicitement :

```bash
bunx nuxt-feathers-zod add service messages --schema zod
bunx nuxt-feathers-zod add service messages --schema json
```

## Auth sur un service

```bash
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

En pratique, `users` reste le service de référence pour l’auth embedded.

## Endpoints REST

Avec `rest.path = '/feathers'` :

- `GET /feathers/articles`
- `GET /feathers/articles/:id`
- `POST /feathers/articles`
- `PATCH /feathers/articles/:id`
- `DELETE /feathers/articles/:id`

## Bonnes pratiques

- conserver `servicesDirs: ['services']`
- ne pas déplacer les services hors d’un dossier scanné
- générer via la CLI puis personnaliser
- ne pas casser `*.shared.ts` sans comprendre son rôle côté client
