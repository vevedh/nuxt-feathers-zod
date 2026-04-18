#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

function normalize(path) {
  return path.replace(/\\/g, '/')
}

const root = process.cwd()
const runtimeRoot = join(root, 'src', 'runtime')
const allowPrefixes = [normalize(join(runtimeRoot, 'templates'))]
const allowFiles = new Set([
  join(root, 'src', 'client.ts'),
  join(root, 'src', 'server.ts'),
])
const violations = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full)
      continue
    }
    if (!/\.(ts|mts|js|mjs)$/.test(full))
      continue
    if (allowFiles.has(full))
      continue
    if (allowPrefixes.some(prefix => normalize(full).startsWith(prefix + '/')))
      continue

    const content = readFileSync(full, 'utf8')
    const matches = [...content.matchAll(/from\s+['"](nuxt-feathers-zod(?:\/[^'"]+)?)['"]/g)]
    for (const match of matches) {
      violations.push({ file: relative(root, full), specifier: match[1] })
    }
  }
}

walk(runtimeRoot)

if (violations.length) {
  console.error('[nuxt-feathers-zod] Forbidden internal self-imports detected outside template/runtime entrypoint boundaries:')
  for (const violation of violations)
    console.error(`- ${violation.file}: ${violation.specifier}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Internal runtime self-import boundaries OK')
