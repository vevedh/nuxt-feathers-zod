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

### `EPERM: Operation not permitted (NtSetInformationFile)` during `bun install`

This Windows error can interrupt extraction into Bun's shared cache and leave `node_modules` incomplete. Follow-up errors such as `Cannot find module 'lodash.merge'` or `human-signals` are consequences of the interrupted installation rather than independent module defects.

Close Nuxt/Vite servers, Vitest, Playwright and Node/Bun processes using the workspace, then run one gate:

```powershell
bun run verify:windows
```

`verify:windows` verifies or installs dependencies automatically. On Windows, the default cache lives under `%LOCALAPPDATA%/nuxt-feathers-zod/bun-install-cache`, so valid downloads are reused across newly extracted release folders. The installer cleans only incomplete `node_modules` and transient cache entries, disables lifecycle scripts while packages are being extracted so a `postinstall` never runs against a partial tree, then reduces network concurrency from 8 to 2 and finally 1 when an `NtSetInformationFile` lock is detected.

If the shared-cache attempts remain blocked, one final rescue install uses an isolated temporary cache, network concurrency 1 and Bun's `--no-cache` mode to bypass the manifest cache. NFZ prepare, build and validation scripts run explicitly later in the gate, after the dependency tree has been verified. After a verified install, a fingerprint of `package.json`, `bun.lock`, the Bun version and the installation strategy prevents an identical reinstall.

For the complete release gate, first copy the untracked local template:

```powershell
Copy-Item .env.release.example .env.release.local
bun run verify:release:windows
```

The gate automatically loads `.env.release.local` when `MONGODB_URL` is not already defined in the process. An explicit process environment variable still takes precedence over the local file.

If `bun run install:windows` was already executed, the full gate detects and reuses the verified installation. The explicit mode below refuses to reinstall and fails when the state no longer matches the lockfile:

```powershell
bun run verify:release:windows:skip-install
```

Set `NFZ_WINDOWS_CACHE_DIR` to place the cache outside the project. Use `bun run install:windows -- --force` only when a clean reinstall is required. Do not separate release gates with `;` in PowerShell: subsequent commands continue after a failed install and produce misleading secondary failures.

Public and private VitePress builds use a separate dependency workspace. On Windows, their shared cache defaults to `%LOCALAPPDATA%/nuxt-feathers-zod/bun-docs-cache`. The runner applies the same protections: lifecycle scripts disabled, retries at 8 → 2 → 1, then one isolated `--no-cache` rescue attempt. A verified VitePress install is fingerprinted and reused. Set `NFZ_DOCS_CACHE_DIR` to relocate only this cache.

The VitePress installation is verified statically from `package.json`, the published CLI bin and the exact version recorded in `bun.lock`; the runner no longer executes `vitepress --version` to validate an installation. The real build then runs with Node.js. During a long build, the runner prints a heartbeat so the terminal shows that work is still progressing. The Bun probe is bounded to 20 seconds and builds to 15 minutes by default. A process exceeding that deadline is terminated with its complete child tree and the gate returns an explicit error instead of holding the shell indefinitely. Override the defaults with `NFZ_DOCS_PROBE_TIMEOUT_MS`, `NFZ_DOCS_BUILD_TIMEOUT_MS` and `NFZ_DOCS_HEARTBEAT_MS`.

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

<!-- release-version: 6.7.37 -->
