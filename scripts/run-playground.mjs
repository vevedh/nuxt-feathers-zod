#!/usr/bin/env node

import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const command = args.shift() || 'dev'
const allowedCommands = new Set(['dev', 'build', 'preview', 'prepare'])
const rootDir = fileURLToPath(new URL('..', import.meta.url))
const playgroundDir = resolve(rootDir, 'playground')

if (!allowedCommands.has(command)) {
  console.error(`[nuxt-feathers-zod] Unsupported playground command: ${command}`)
  process.exitCode = 1
}
else {
  await import('./ensure-playground-self-link.mjs')

  // A production build only needs to compile the playground. Starting
  // mongodb-memory-server here would trigger a MongoDB binary download and
  // make offline/CI builds unnecessarily fragile. Explicit user settings
  // still win, so a real MongoDB URL can be validated when required.
  if (command === 'build' && process.env.NFZ_PLAYGROUND_EMBEDDED_MONGODB === undefined) {
    process.env.NFZ_PLAYGROUND_EMBEDDED_MONGODB = 'false'
    console.info('[nuxt-feathers-zod] playground build: embedded MongoDB disabled (set NFZ_PLAYGROUND_EMBEDDED_MONGODB=true to override)')
  }

  if (command === 'build') {
    // The programmatic Nuxt API can close its hooks explicitly after a build.
    // This prevents lingering handles from mongodb-memory-server or Nitro and
    // keeps the command deterministic in CI and on Windows.
    const { buildNuxt, loadNuxt } = await import('@nuxt/kit')
    const nuxt = await loadNuxt({
      cwd: playgroundDir,
      dev: false,
      ready: true,
      overrides: {
        rootDir: playgroundDir,
        buildDir: resolve(playgroundDir, '.nuxt'),
      },
    })
    try {
      await buildNuxt(nuxt)
    }
    finally {
      await nuxt.close()
    }
  }
  else {
    // Run the project-local Nuxt CLI in this Node.js process. This avoids
    // Windows PATH/shim lookup and long-running child-process issues in Bun.
    process.argv = [process.execPath, 'nuxi', command, 'playground', ...args]
    await import('@nuxt/cli/cli')
  }
}
