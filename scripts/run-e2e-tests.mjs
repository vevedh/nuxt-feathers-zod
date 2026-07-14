import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()
const e2eDir = resolve(root, 'test/e2e')
const vitestBin = resolve(root, 'node_modules/vitest/vitest.mjs')
const files = readdirSync(e2eDir)
  .filter(name => name.endsWith('.spec.ts'))
  .sort()
  .map(name => `test/e2e/${name}`)

if (!files.length) {
  console.error('[nuxt-feathers-zod] No E2E specifications found.')
  process.exit(1)
}

for (const file of files) {
  console.log(`[nuxt-feathers-zod] E2E ${file}`)
  const result = spawnSync(process.execPath, [
    vitestBin,
    'run',
    '-c',
    'vitest.e2e.config.mts',
    file,
  ], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })

  if (result.error) {
    console.error(`[nuxt-feathers-zod] Failed to start E2E ${file}:`, result.error)
    process.exit(1)
  }
  if (result.status !== 0)
    process.exit(result.status ?? 1)
}

console.log(`[nuxt-feathers-zod] E2E suite passed (${files.length} isolated specifications).`)
