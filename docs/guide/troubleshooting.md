---
editLink: false
---
# Dépannage

## 1) `Services typeExports []` / `Entity class User not found`

Cause la plus fréquente :

- `servicesDirs` incorrect,
- service créé manuellement,
- auth activée avant la génération de `users`.

Fix recommandé :

```bash
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

<!-- mongodb-adapter-note -->
> **Note MongoDB** — Quand tu utilises `--adapter mongodb`, une base MongoDB doit déjà être active et joignable par l'application. Tu peux générer rapidement un `docker-compose.yaml` pour démarrer une base MongoDB en écoute avec : `bunx nuxt-feathers-zod add mongodb-compose`.

et vérifier :

```ts
feathers: {
  servicesDirs: ['services']
}
```

## 2) `Could not load .../src/module.ts`

Ce message peut masquer une vraie erreur TypeScript dans un fichier importé.

Vérifier en priorité :

- templates générés,
- imports locaux `.ts` sous Windows,
- template strings cassées.

## 3) Swagger UI ne charge pas la spec

Utiliser `../swagger.json` depuis `/feathers/docs/`.

## 4) Le build docs VitePress casse sur du frontmatter

Toujours fermer correctement le bloc YAML avant le contenu Markdown.

## 5) Le mode remote semble OK mais rien ne répond

Vérifier :

- `client.remote.url`
- `transport`
- `restPath` / `websocketPath`
- services déclarés dans `client.remote.services`
- en mode remote, `transport: 'auto'` se résout actuellement vers Socket.IO ; utiliser `transport: 'rest'` pour un premier diagnostic réseau/CORS
- auth remote si activée

## Commandes utiles

```bash
bunx nuxt-feathers-zod doctor
bun run build
bun run docs:dev
```
