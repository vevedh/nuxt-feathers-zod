# Server modules

Les **server modules** sont des fonctions exécutées dans le plugin embedded après les services et plugins Feathers, puis avant le montage des routes.

## Différence avec les plugins Feathers

| Type | Dossier | Signature | Usage |
|---|---|---|---|
| Plugin Feathers | `server/feathers/*.ts` | `app.configure(plugin)` | enregistrer des plugins Feathers |
| Server module | `server/feathers/modules/*.ts` | `(app, ctx) => void \| Promise<void>` | setup serveur transverse |

## Signature

```ts
import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

export default defineFeathersServerModule(async (app, ctx) => {
  app.set('metricsEnabled', true)
})
```

## Contexte `ctx`

```ts
{
  nitroApp,
  config,
  transports: config.transports,
  server: config.server,
}
```

## Génération CLI

```bash
bunx nuxt-feathers-zod add middleware metrics --target server-module
```


## Résolution et chargement

Les modules serveur complémentaires se gèrent comme `servicesDirs`, mais avec les options suivantes :

```ts
export default defineNuxtConfig({
  feathers: {
    server: {
      moduleDirs: ['server/feathers/modules'],
      modules: [
        'server/feathers/custom/audit.ts'
      ]
    }
  }
})
```

Ordre de chargement :
1. scan de `server.moduleDirs`
2. ajout explicite via `server.modules`

Chaque module exporte une fonction par défaut `(app, ctx) => void | Promise<void>`.


## Génération CLI

```bash
bunx nuxt-feathers-zod add server-module secure-defaults
```

Cette commande est la voie recommandée pour créer un module complémentaire embedded.


## Express server-module presets

Supported preset names: `helmet`, `security-headers`, `request-logger`, `healthcheck`, `rate-limit`, `express-baseline`.

Examples:

```bash
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add server-module express-baseline --preset express-baseline
```

`express-baseline` generates a ready-to-review baseline set in `server/feathers/modules`: `helmet`, `security-headers`, `request-logger`, `healthcheck`, `rate-limit`.


## Granular Express modules via `feathers.server.modules`

`feathers.server.secureDefaults` and `feathers.server.secure` are normalized into the same built-in Express server modules at runtime. This avoids a separate middleware path in `app.ts` and keeps one execution model for embedded HTTP middleware. Merge order: scanned `moduleDirs` -> normalized secure modules -> explicit `server.modules`. Explicit built-ins listed in `server.modules` override the normalized secure counterpart for the same builtin name.


You can now declare structured module entries with runtime options:

```ts
feathers: {
  server: {
    modules: [
      { src: 'cors', options: { origin: true, credentials: true } },
      { src: 'helmet', options: { contentSecurityPolicy: false } },
      { src: 'compression', options: { threshold: 1024 } },
      { src: 'body-parser', options: { json: { limit: '1mb' }, urlencoded: { extended: true } } },
      { src: 'serve-static', options: { path: '/', dir: 'public' } },
      { src: 'healthcheck', options: { path: '/healthz', payload: { status: 'ok' } } },
      { src: 'rate-limit', options: { max: 100, windowMs: 60000 } }
    ]
  }
}
```

Supported built-in Express module ids: `cors`, `helmet`, `compression`, `body-parser`, `serve-static`, `healthcheck`, `rate-limit`.

At runtime, each module receives its own options as `ctx.moduleOptions`.
