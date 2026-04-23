#!/usr/bin/env node
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const exportsMap = pkg.exports || {}
const typesVersions = pkg.typesVersions?.['*'] || {}
const binMap = pkg.bin || {}
const filesList = pkg.files || []

const problems = []

function checkFile(rel, label) {
  const abs = resolve(rootDir, rel)
  if (!existsSync(abs) || !statSync(abs).isFile())
    problems.push(`${label} missing file: ${rel}`)
}

function checkDirHasMatches(pattern, label) {
  const relDir = dirname(pattern)
  const absDir = resolve(rootDir, relDir)
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) {
    problems.push(`${label} missing directory: ${relDir}`)
    return
  }
  const suffix = pattern.endsWith('*.js') ? '.js' : pattern.endsWith('*.d.ts') ? '.d.ts' : ''
  const entries = readdirSync(absDir).filter(name => !suffix || name.endsWith(suffix))
  if (!entries.length)
    problems.push(`${label} has no matches in: ${pattern}`)
}

for (const [subpath, target] of Object.entries(exportsMap)) {
  if (!target || typeof target !== 'object')
    continue
  for (const [kind, rel] of Object.entries(target)) {
    if (typeof rel !== 'string')
      continue
    if (rel.includes('*')) checkDirHasMatches(rel, `export ${subpath} ${kind}`)
    else checkFile(rel, `export ${subpath} ${kind}`)
  }
}

for (const [key, entries] of Object.entries(typesVersions)) {
  const first = Array.isArray(entries) ? entries[0] : null
  if (!first || typeof first !== 'string')
    continue
  if (first.includes('*')) checkDirHasMatches(first, `typesVersions ${key}`)
  else checkFile(first, `typesVersions ${key}`)
}

for (const [name, rel] of Object.entries(binMap)) {
  if (typeof rel === 'string')
    checkFile(rel, `bin ${name}`)
}

if (!filesList.includes('dist')) problems.push('package.json files must include dist')
if (!filesList.includes('bin')) problems.push('package.json files must include bin')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Package export sanity failed:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Package exports, typesVersions and bin targets OK')
