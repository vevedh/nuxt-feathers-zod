#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const cliDir = resolve(rootDir, 'dist/cli')
const cliEntry = resolve(cliDir, 'index.mjs')
const cliMeta = resolve(cliDir, 'package.json')

const missing = []
if (!existsSync(cliEntry)) missing.push('dist/cli/index.mjs')
if (!existsSync(cliMeta)) missing.push('dist/cli/package.json')

if (missing.length) {
  console.error(`[nuxt-feathers-zod] Missing CLI dist artifacts: ${missing.join(', ')}`)
  process.exit(1)
}

const meta = JSON.parse(readFileSync(cliMeta, 'utf8'))
const problems = []
if (meta.type !== 'module') problems.push('dist/cli/package.json must set type=module')
if (meta.private !== true) problems.push('dist/cli/package.json should stay private=true')
if (!meta.bin || meta.bin['nuxt-feathers-zod'] !== './index.mjs' || meta.bin.nfz !== './index.mjs') {
  problems.push('dist/cli/package.json must expose nuxt-feathers-zod and nfz bin entries')
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] CLI dist metadata invalid:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] CLI dist metadata OK')
