---
editLink: false
---
# Troubleshooting

## 1) `Services typeExports []` / `Entity class User not found`

Most common cause:

- wrong `servicesDirs`,
- manually created service,
- auth enabled before generating `users`.

Recommended fix:

```bash
bunx nuxt-feathers-zod add service users --auth --adapter mongodb --collection users --idField _id
```

<!-- mongodb-adapter-note -->
> **MongoDB note** — When you use `--adapter mongodb`, a running MongoDB database must already be available and reachable by the app. You can quickly generate a `docker-compose.yaml` to start a listening MongoDB instance with: `bunx nuxt-feathers-zod add mongodb-compose`.

and verify:

```ts
feathers: {
  servicesDirs: ['services']
}
```

## 2) `Could not load .../src/module.ts`

This message may hide a real TypeScript error in an imported file.

Check first:

- generated templates,
- local `.ts` imports on Windows,
- broken template strings.

## 3) Swagger UI does not load the spec

Use `../swagger.json` from `/feathers/docs/`.

## 4) VitePress docs build breaks on frontmatter

Always close the YAML block before Markdown content.

## 5) Remote mode looks correct but nothing responds

Check:

- `client.remote.url`
- `transport`
- `restPath` / `websocketPath`
- services declared in `client.remote.services`
- in embedded browser mode, `transport: 'auto'` now prefers REST
- in remote mode, `transport: 'auto'` prefers Socket.IO when available, otherwise REST; use `transport: 'rest'` for a first-pass network/CORS diagnostic
- remote auth if enabled

## 6) `ReferenceError: exports is not defined` or `does not provide an export named 'feathers'`

These browser errors appear when Vite serves the raw CJS build of `@feathersjs/feathers` to the browser — typically when the module is installed from a **packed `.tgz` tarball** (npm mode) rather than a local `file://` link.

**Root cause**: in tarball mode, Vite treats `nuxt-feathers-zod` as a regular `node_modules` package. Without explicit interop, Vite can serve `@feathersjs/feathers/lib/index.js` (CJS) directly to the browser, which does not know about `exports`.

**Fix — upgrade to `nuxt-feathers-zod` ≥ 6.5.10**

From version 6.5.10 onwards, the NFZ browser client is **100% native**: it no longer imports `@feathersjs/feathers` in browser-served code. The `NativeFeathersClient` class built into the runtime implements the Feathers API subset needed by generated clients (`configure`, `use`, `service`, `set/get`, auth, events).

```bash
# Update the tarball in your app
bun remove nuxt-feathers-zod
bun add ../nuxt-feathers-zod/nuxt-feathers-zod-6.5.10.tgz   # or later version

# Clear caches
bunx nuxi cleanup
rm -rf .nuxt node_modules/.vite
bun dev --force
```

**Recommended `nuxt.config.ts`** configuration:

```ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'nuxt-feathers-zod'],
  feathers: {
    client: {
      mode: 'embedded',
      pinia: false,   // Feathers-Pinia disabled — @pinia/nuxt stays active for your stores
    },
  },
})
```

> No manual `vite:` block needed from v6.5.11 onward. Do **not** force `@feathersjs/*` into `optimizeDeps.include` — this would reintroduce the problem.

**Why Vite hints alone are not enough**

Entries like `nuxt-feathers-zod > @feathersjs/feathers` in `optimizeDeps.include` (patches v6.5.5–6.5.9) were ineffective: `nuxt-feathers-zod` is a build-time Nuxt module — it is never part of the Vite browser graph. Vite therefore ignores nested hints. The correct fix is to eliminate the CJS import at the source.

## Useful commands

```bash
bunx nuxt-feathers-zod doctor
bun run build
bun run docs:dev
```

> Transport note (6.4.129): in generated clients, `transport: 'auto'` now resolves deterministically. Embedded browser mode prefers REST first; remote mode prefers Socket.IO when available, then falls back to REST.
