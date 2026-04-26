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
- en mode embedded navigateur, `transport: 'auto'` privilégie maintenant REST
- en mode remote, `transport: 'auto'` privilégie Socket.IO si disponible, sinon REST ; utiliser `transport: 'rest'` pour un premier diagnostic réseau/CORS
- auth remote si activée

## 6) `ReferenceError: exports is not defined` ou `does not provide an export named 'feathers'`

Ces erreurs navigateur apparaissent lorsque Vite sert le fichier CJS brut de `@feathersjs/feathers` au browser — typiquement quand le module est installé depuis un **tarball `.tgz`** (mode npm) plutôt qu'en `file://` local.

**Cause racine** : en mode tarball, Vite traite `nuxt-feathers-zod` comme un package `node_modules` normal. Sans interop explicite, Vite peut servir `@feathersjs/feathers/lib/index.js` (CJS) directement au navigateur, qui ne connaît pas `exports`.

**Solution — mettre à jour vers `nuxt-feathers-zod` ≥ 6.5.10**

À partir de la version 6.5.10, le client browser NFZ est **100 % natif** : il n'importe plus `@feathersjs/feathers` dans le code servi au navigateur. La classe `NativeFeathersClient` embarquée dans le runtime implémente le sous-ensemble d'API Feathers nécessaire aux clients générés (`configure`, `use`, `service`, `set/get`, auth, events).

```bash
# Mettre à jour le tarball dans ton application
bun remove nuxt-feathers-zod
bun add ../nuxt-feathers-zod/nuxt-feathers-zod-6.5.10.tgz   # ou version suivante

# Nettoyer le cache
bunx nuxi cleanup
rm -rf .nuxt node_modules/.vite
bun dev --force
```

**Configuration recommandée** dans `nuxt.config.ts` :

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'embedded',
      pinia: false,   // Feathers-Pinia désactivé — @pinia/nuxt reste actif pour tes stores
    },
  },
})
```

> Aucun bloc `vite:` manuel n'est nécessaire à partir de la v6.5.11. Ne pas forcer `@feathersjs/*` dans `optimizeDeps.include` — cela réintroduirait le problème.

**Pourquoi les hints Vite ne suffisent pas**

Les entrées `nuxt-feathers-zod > @feathersjs/feathers` dans `optimizeDeps.include` (patches v6.5.5–6.5.9) n'étaient pas efficaces : `nuxt-feathers-zod` est un module Nuxt de build-time — il n'est jamais dans le graph Vite browser. Vite ignore donc les hints imbriqués. La vraie solution est d'éliminer l'import CJS à la source.

## Commandes utiles

```bash
bunx nuxt-feathers-zod doctor
bun run build
bun run docs:dev
```

> Note transport (6.4.129) : dans les clients générés, `transport: 'auto'` est maintenant résolu de façon déterministe. En mode embedded navigateur, REST est préféré ; en mode remote, Socket.IO est préféré quand il est disponible, sinon REST.
