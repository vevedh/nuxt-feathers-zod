## Consolidation P7

The module now has **two builtin server-module families**:
- `src/runtime/server/modules/express/*`
- `src/runtime/server/modules/koa/*`

Builtin ids are the same on both families:
- `secure-defaults`
- `cors`
- `helmet`
- `compression`
- `body-parser`
- `serve-static`
- `healthcheck`
- `rate-limit`

Resolution is framework-aware and depends on `feathers.transports.rest.framework`.

# Server Modules

Server modules extend the embedded Feathers server.

Location:

server/feathers

Example:

server/feathers
 ├─ mongodb.ts
 ├─ secure-defaults.ts
 ├─ helmet.ts
 └─ compression.ts

Modules must use:

defineFeathersServerModule()

## Current stable convention (2026-03-06)

- Project-level server modules live in `server/feathers/modules`.
- CLI generator target `--target server-module` must write in that folder.
- Current embedded server hardening target is **Option A = Express only**.
- Fine-grained flags map to `feathers.server.secure`: `cors`, `compression`, `helmet`, `bodyParser.json`, `bodyParser.urlencoded`, `serveStatic`.



## Résolution type `servicesDirs`

Les modules serveur complémentaires suivent désormais la même logique conceptuelle que `servicesDirs` :
- `feathers.server.moduleDirs` = dossiers scannés
- `feathers.server.modules` = fichiers/modules ajoutés explicitement
- ordre stable = scan d'abord, liste ensuite

Contrainte de robustesse : éviter dans les templates générés les imports relatifs fragiles entre fichiers `.nuxt/feathers/server/**`; préférer soit une fonction exportée locale simple, soit l'alias `nuxt-feathers-zod/server` pour les modules utilisateur.


## CLI recommandée

```bash
bunx nuxt-feathers-zod add server-module audit
```

Cette commande génère le fichier dans `server/feathers/modules` et aligne `nuxt.config` avec `feathers.server.moduleDirs`.


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

- Fix7a/fix8: corrected framework-aware builtin server module resolution on Windows by resolving explicit `.ts` files for builtins (`express/*`, `koa/*`) before `scanExports`, fixing ENOENT on `body-parser`, `serve-static`, etc.


## PATCH fix9
- Fixed published package builtin server modules resolution: builtins are now resolved from `src/runtime/server/modules/*` at package root instead of `dist/runtime/server/modules/*`.
- Added `src/runtime/server/modules` to published package `files` so installed Nuxt apps can resolve Express/Koa builtins during `nuxt prepare` and build on Windows and other platforms.

- fix10: corrected generated preset module `healthcheck.ts` in CLI templates; removed regex-based `basePath.replace(/\/$/, ...)` which lost its backslash in generated output and broke Nitro/esbuild parsing in consumer Nuxt apps. Now uses `endsWith('/')` concatenation.
