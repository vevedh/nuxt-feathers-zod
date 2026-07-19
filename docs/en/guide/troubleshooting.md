---
editLink: false
---
# Troubleshooting

This page documents diagnostics for Nuxt, Bun, Vite, Feathers and NFZ, its configuration contract and the recommended usage pattern for application developers.

## Purpose

Diagnostics for nuxt, bun, vite, feathers and nfz helps keep the Nuxt module configuration, Feathers runtime, generated services, TypeScript client and CLI workflow aligned.

## When to use this option

Use this page when you need to:

- configure diagnostics for Nuxt, Bun, Vite, Feathers and NFZ;
- document the decision in a starter or application;
- validate the setup with a CLI command;
- avoid drift between configuration, generated files and runtime behavior.

## Configuration example

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],

  feathers: {
    servicesDirs: ['services'],
    client: true,
    transports: {
      rest: { path: '/feathers' },
      websocket: false,
    },
  }
})
```

## CLI example

```bash
bunx nuxt-feathers-zod doctor
bun run clean:repo
```

### `nuxi requires @nuxt/kit` after extracting the archive

This error occurs when `nuxi` runs before the local dependencies are installed. Use this order:

```powershell
bun install --frozen-lockfile
bun run clean:repo
bun run typecheck
bun run dev
```

The `clean:repo` script does not load Nuxt, so it remains available when `.nuxt`, `.output`, Nitro or Vite caches must be removed.

### `spawnSync bun ENOENT` during `bun install`

Starting with 6.5.35, the CLI build calls `Bun.build()` directly in the active Bun process. It no longer searches for a second `bun` executable through the Windows `PATH`.

### Exit code `58` after the playground starts

The project now requires Bun `>=1.3.6`. Upgrade Bun first with `bun upgrade`, then confirm the installed version with `bun --version`.

`bun run dev` no longer relies on Bun's Windows `nuxi` shim. `scripts/run-playground.mjs` imports the local `@nuxt/cli/cli` entry directly inside a Node.js process without spawning a child process. This path reduces lifecycle issues reported with long-running Vite development servers on Windows.

If Nitro has built and the Feathers server reports that MongoDB is ready, application initialization succeeded. Pre-bundling `socket.io-client` also avoids late dependency discovery and the related Vite restart.

## Runtime example

```ts
const service = useService('messages')

const result = await service.find({
  query: {
    $limit: 10,
    $sort: { createdAt: -1 },
  },
})
```

## Practical advice

- Keep runtime-affecting options explicit in `nuxt.config.ts`.
- Prefer CLI-generated services so manifests and generated types stay synchronized.
- Run `bunx nuxt-feathers-zod doctor` after structural changes.
- Use `--dry` before write operations on an existing project.

<!-- release-version: 6.6.0 -->
