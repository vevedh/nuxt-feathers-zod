# Server modules

**Server modules** are functions executed in the embedded plugin after services and Feathers plugins, then before router mounting.

## Signature

```ts
import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

export default defineFeathersServerModule(async (app, ctx) => {
  app.set('metricsEnabled', true)
})
```

## CLI generation

```bash
bunx nuxt-feathers-zod add middleware metrics --target server-module
```


## Express server-module presets

Supported preset names: `helmet`, `security-headers`, `request-logger`, `healthcheck`, `rate-limit`, `express-baseline`.

Examples:

```bash
bunx nuxt-feathers-zod add server-module helmet --preset helmet
bunx nuxt-feathers-zod add server-module express-baseline --preset express-baseline
```

`express-baseline` generates a ready-to-review baseline set in `server/feathers/modules`: `helmet`, `security-headers`, `request-logger`, `healthcheck`, `rate-limit`.


## Granular Express modules via `feathers.server.modules`

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
