#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = process.cwd()
const sourceOnly = process.argv.includes('--source')
const errors = []
const dependencyFields = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function collectPackageJsonFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.nuxt', '.output', 'dist', '.release-work'].includes(entry.name))
      continue

    const absolute = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectPackageJsonFiles(absolute, out)
      continue
    }
    if (entry.name === 'package.json')
      out.push(absolute)
  }
  return out
}

for (const path of collectPackageJsonFiles(root)) {
  const pkg = readJson(path)
  for (const field of dependencyFields) {
    if (pkg[field]?.['@gabortorma/mwm'])
      errors.push(`${relative(root, path)} still declares @gabortorma/mwm in ${field}`)
  }
}

const rootPackage = readJson(resolve(root, 'package.json'))
for (const [name, command] of Object.entries(rootPackage.scripts ?? {})) {
  if (name.startsWith('maintenance:mwm:') || name.startsWith('sanity:mwm-'))
    continue
  if (/\bmwm(?:\s|$)/i.test(String(command)))
    errors.push(`package.json script ${name} still invokes the mwm CLI`)
}

if (!sourceOnly) {
  for (const lock of ['bun.lock', 'playground/bun.lock']) {
    const path = resolve(root, lock)
    if (!existsSync(path)) {
      errors.push(`${lock} is missing`)
      continue
    }
    const content = readFileSync(path, 'utf8')
    if (content.includes('@gabortorma/mwm'))
      errors.push(`${lock} still contains @gabortorma/mwm; run bun run maintenance:mwm:sync-lock`)
  }
}

if (errors.length) {
  console.error('[nuxt-feathers-zod] MWM removal policy failed:')
  for (const error of errors)
    console.error(`- ${error}`)
  process.exit(1)
}

if (sourceOnly) {
  console.log('[nuxt-feathers-zod] MWM source removal is complete: no package manifest declares @gabortorma/mwm and no active project script invokes the legacy mwm CLI.')
}
else {
  console.log('[nuxt-feathers-zod] MWM removal is complete: manifests/scripts are clean and root/playground Bun locks contain no @gabortorma/mwm package records.')
}
