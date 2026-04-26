#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const targets = [
  'src/runtime/client',
  'src/runtime/composables',
  'src/runtime/plugins',
  'src/runtime/stores',
  'src/runtime/adapters',
  'src/runtime/templates/client',
  'dist/runtime/client',
  'dist/runtime/composables',
  'dist/runtime/plugins',
  'dist/runtime/stores',
  'dist/runtime/adapters',
  'dist/runtime/templates/client',
]

const externalPackages = [
  '@feathersjs/feathers',
  '@feathersjs/rest-client',
  '@feathersjs/socketio-client',
  '@feathersjs/authentication-client',
  'feathers-pinia',
]

const badPatterns = externalPackages.flatMap((pkg) => [
  {
    label: `default import from ${pkg}`,
    pattern: new RegExp(String.raw`(^|\n)\s*import\s+(?!type\b)(?!\*\s+as\b)[A-Za-z_$][\w$]*\s+from\s+['"]${escapeRegExp(pkg)}['"]`, 'g'),
  },
  {
    label: `named import from ${pkg}`,
    pattern: new RegExp(String.raw`(^|\n)\s*import\s+(?!type\b)\{[^}]+\}\s+from\s+['"]${escapeRegExp(pkg)}['"]`, 'g'),
  },
  {
    label: `named re-export from ${pkg}`,
    pattern: new RegExp(String.raw`(^|\n)\s*export\s+\{[^}]+\}\s+from\s+['"]${escapeRegExp(pkg)}['"]`, 'g'),
  },
  {
    label: `default re-export from ${pkg}`,
    pattern: new RegExp(String.raw`(^|\n)\s*export\s+\{\s*default\b[^}]*\}\s+from\s+['"]${escapeRegExp(pkg)}['"]`, 'g'),
  },
])

const files = []
for (const target of targets) {
  const abs = join(root, target)
  walk(abs, files)
}

const failures = []
for (const file of files) {
  if (!/\.(?:ts|mts|js|mjs|vue)$/.test(file))
    continue

  const source = readFileSync(file, 'utf8')
  for (const { label, pattern } of badPatterns) {
    pattern.lastIndex = 0
    const matches = [...source.matchAll(pattern)]
    for (const match of matches) {
      const index = match.index ?? 0
      const line = source.slice(0, index).split('\n').length
      failures.push(`${relative(root, file)}:${line} - ${label}`)
    }
  }
}


const optimizerSourceFiles = [
  'src/setup/apply-client-layer.ts',
  'dist/module.mjs',
]
const requiredOptimizerFragments = [
  'FEATHERS_CLIENT_TARBALL_CJS_DEPS',
  'nuxt-feathers-zod > ${dep}',
  'FEATHERS_PINIA_TARBALL_CJS_DEPS',
  'feathers-pinia > ${dep}',
]
for (const optimizerFile of optimizerSourceFiles) {
  const abs = join(root, optimizerFile)
  let source = ''
  try {
    source = readFileSync(abs, 'utf8')
  }
  catch {
    continue
  }

  for (const fragment of requiredOptimizerFragments) {
    if (!source.includes(fragment))
      failures.push(`${optimizerFile} - missing Vite nested CJS optimizer fragment: ${fragment}`)
  }
}

if (failures.length) {
  console.error('[nuxt-feathers-zod] Forbidden fragile browser-runtime imports detected:\n')
  for (const failure of failures)
    console.error(`- ${failure}`)
  console.error('\nAllowed patterns: import type, import * as <namespace>, or dynamic import() with runtime factory resolution.')
  process.exit(1)
}

console.log('[nuxt-feathers-zod] client runtime ESM interop guard passed.')

function walk(dir, out) {
  try {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry)
      const stat = statSync(abs)
      if (stat.isDirectory())
        walk(abs, out)
      else if (stat.isFile())
        out.push(abs)
    }
  }
  catch {
    // Optional directories may not exist before a build.
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
