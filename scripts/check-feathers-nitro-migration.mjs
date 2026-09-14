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
const expectedVersion = '0.6.0'
const expectedNodeEngine = '^22.19.0 || ^24.11.0 || >=26.0.0'
const expectedFeathersRange = '^5.0.49'
const expectedNitroVersion = '2.13.4'
const expectedH3Version = '1.15.11'
const legacyPackage = '@gabortorma/feathers-nitro-adapter'
const failures = []

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
assert(packageJson.dependencies?.['@feathersjs/feathers'] === '5.0.49',
  'The root Feathers runtime must remain pinned to 5.0.49 for this migration.')
assert(packageJson.dependencies?.nitropack === expectedNitroVersion,
  `The root Nitro runtime must remain pinned to ${expectedNitroVersion}.`)
assert(packageJson.dependencies?.h3 === expectedH3Version,
  `The root H3 runtime must remain pinned to ${expectedH3Version}.`)

assert(lock.includes(`"${expectedPackage}": "${expectedVersion}"`),
  `bun.lock workspace dependencies do not pin ${expectedPackage} to ${expectedVersion}.`)
assert(lock.includes(`"${expectedPackage}": ["${expectedPackage}@${expectedVersion}"`),
  `bun.lock does not contain the resolved ${expectedPackage}@${expectedVersion} package entry.`)
assert(!lock.includes(`"${legacyPackage}": [`),
  `bun.lock still resolves the legacy package ${legacyPackage}.`)

const adapterLine = lock.split('\n').find(line => line.includes(`"${expectedPackage}": ["${expectedPackage}@${expectedVersion}"`)) ?? ''
assert(adapterLine.includes(`"@feathersjs/feathers": "${expectedFeathersRange}"`),
  `${expectedPackage}@${expectedVersion} must resolve with @feathersjs/feathers ${expectedFeathersRange}.`)
assert(adapterLine.includes(`"nitropack": "${expectedNitroVersion}"`),
  `${expectedPackage}@${expectedVersion} must resolve with nitropack ${expectedNitroVersion}.`)
assert(adapterLine.includes(`"h3": "${expectedH3Version}"`),
  `${expectedPackage}@${expectedVersion} must resolve with h3 ${expectedH3Version}.`)

assert(appTemplate.includes(`from '${expectedPackage}/handlers'`),
  'The generated server app template does not use the supported Koa handler entry point.')
assert(pluginTemplate.includes(`from '${expectedPackage}/handlers'`),
  'The generated Nitro plugin template does not use the supported Express handler entry point.')
assert(pluginTemplate.includes(`from '${expectedPackage}/routers'`),
  'The generated Nitro plugin template does not use the supported router entry point.')
assert(!appTemplate.includes(legacyPackage) && !pluginTemplate.includes(legacyPackage),
  'A generated server template still imports the legacy adapter.')

if (failures.length > 0) {
  console.error('[nuxt-feathers-zod] Feathers Nitro migration guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[nuxt-feathers-zod] ${expectedPackage}@${expectedVersion} is aligned with Feathers 5.0.49, Nitro ${expectedNitroVersion}, H3 ${expectedH3Version} and the Node runtime floor.`,
)
