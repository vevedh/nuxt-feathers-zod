#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const lock = read('bun.lock')
const appTemplate = read('src/runtime/templates/server/app.ts')
const pluginTemplate = read('src/runtime/templates/server/plugin.ts')

const expectedPackage = '@vevedh/feathers-nitro'
const expectedVersion = '0.5.0'
const expectedNodeEngine = '^22.12.0 || ^24.11.0 || >=26.0.0'
const legacyPackage = '@gabortorma/feathers-nitro-adapter'
const failures = []
const warnings = []

function assert(condition, message) {
  if (!condition)
    failures.push(message)
}

assert(packageJson.dependencies?.[expectedPackage] === expectedVersion,
  `package.json must pin ${expectedPackage} to ${expectedVersion}.`)
assert(!(legacyPackage in (packageJson.dependencies ?? {})),
  `package.json still declares the legacy package ${legacyPackage}.`)
assert(packageJson.engines?.node === expectedNodeEngine,
  `package.json engines.node must match the adapter support range: ${expectedNodeEngine}.`)
assert(lock.includes(`"${expectedPackage}": "${expectedVersion}"`),
  `bun.lock workspace dependencies do not pin ${expectedPackage} to ${expectedVersion}.`)
assert(lock.includes(`"${expectedPackage}": ["${expectedPackage}@${expectedVersion}"`),
  `bun.lock does not contain the resolved ${expectedPackage}@${expectedVersion} package entry.`)
assert(!lock.includes(`"${legacyPackage}": [`),
  `bun.lock still resolves the legacy package ${legacyPackage}.`)
assert(appTemplate.includes(`from '${expectedPackage}/handlers'`),
  'The generated server app template does not use the new Koa handler entry point.')
assert(pluginTemplate.includes(`from '${expectedPackage}/handlers'`),
  'The generated Nitro plugin template does not use the new Express handler entry point.')
assert(pluginTemplate.includes(`from '${expectedPackage}/routers'`),
  'The generated Nitro plugin template does not use the new router entry point.')
assert(!appTemplate.includes(legacyPackage) && !pluginTemplate.includes(legacyPackage),
  'A generated server template still imports the legacy adapter.')

const adapterNitroVersion = lock.match(/"@vevedh\/feathers-nitro": \[[^\n]*"nitropack": "([^"]+)"/)?.[1]
const rootNitroVersion = packageJson.dependencies?.nitropack
if (adapterNitroVersion && rootNitroVersion && adapterNitroVersion !== rootNitroVersion) {
  warnings.push(
    `Dependency alignment: ${expectedPackage} declares Nitro ${adapterNitroVersion}, while the module pins ${rootNitroVersion}. `
    + 'The current migration intentionally preserves the existing runtime; validate a dedicated Nitro upgrade separately.',
  )
}

const adapterFeathersRange = lock.match(/"@vevedh\/feathers-nitro": \[[^\n]*"@feathersjs\/feathers": "([^"]+)"/)?.[1]
const rootFeathersVersion = packageJson.dependencies?.['@feathersjs/feathers']
if (adapterFeathersRange && rootFeathersVersion && !adapterFeathersRange.endsWith(rootFeathersVersion)) {
  warnings.push(
    `Dependency alignment: ${expectedPackage} declares @feathersjs/feathers ${adapterFeathersRange}, `
    + `while the module pins ${rootFeathersVersion}. Keep this visible until the Feathers patch-line upgrade is validated.`,
  )
}

if (failures.length > 0) {
  console.error('[nuxt-feathers-zod] Feathers Nitro migration guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] ${expectedPackage}@${expectedVersion} migration guard passed.`)
for (const warning of warnings)
  console.warn(`[nuxt-feathers-zod] Warning: ${warning}`)
