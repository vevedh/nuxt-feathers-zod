import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const readJson = relativePath => JSON.parse(readFileSync(resolve(rootDir, relativePath), 'utf8'))
const pkg = readJson('package.json')
const lock = readFileSync(resolve(rootDir, 'bun.lock'), 'utf8')
const starter = readJson('examples/nfz-quasar-unocss-pinia-starter/package.json')
const keycloakSpa = readJson('examples/nuxt4-keycloak-ldap-spa-ref/package.json')
const keycloakSsr = readJson('examples/nuxt4-keycloak-ldap-ssr-ref/package.json')
const problems = []

const FEATHERS_VERSION = '5.0.49'
const FEATHERS_NITRO_VERSION = '0.6.0'
const NUXT_VERSION = '4.5.2'
const VUE_VERSION = '3.5.42'
const NUXT_TEST_UTILS_VERSION = '4.2.0'
const VITEST_VERSION = '4.1.11'
const NODE_TYPES_VERSION = '22.20.0'
const VITE_VERSION = '8.2.2'
const ROLLDOWN_VERSION = '1.2.4'
const NITRO_VERSION = '2.13.4'
const H3_VERSION = '1.15.11'
const KNEX_PEER_VERSION = '^3.2.10'

const expectedRuntime = {
  '@feathersjs/adapter-commons': FEATHERS_VERSION,
  '@feathersjs/authentication': FEATHERS_VERSION,
  '@feathersjs/authentication-client': FEATHERS_VERSION,
  '@feathersjs/authentication-local': FEATHERS_VERSION,
  '@feathersjs/authentication-oauth': FEATHERS_VERSION,
  '@feathersjs/commons': FEATHERS_VERSION,
  '@feathersjs/configuration': FEATHERS_VERSION,
  '@feathersjs/errors': FEATHERS_VERSION,
  '@feathersjs/express': FEATHERS_VERSION,
  '@feathersjs/feathers': FEATHERS_VERSION,
  '@feathersjs/generators': FEATHERS_VERSION,
  '@feathersjs/koa': FEATHERS_VERSION,
  '@feathersjs/memory': FEATHERS_VERSION,
  '@feathersjs/mongodb': FEATHERS_VERSION,
  '@feathersjs/rest-client': FEATHERS_VERSION,
  '@feathersjs/schema': FEATHERS_VERSION,
  '@feathersjs/socketio': FEATHERS_VERSION,
  '@feathersjs/socketio-client': FEATHERS_VERSION,
  '@vevedh/feathers-nitro': FEATHERS_NITRO_VERSION,
  '@nuxt/kit': NUXT_VERSION,
  '@nuxt/devtools-kit': '3.4.1',
  h3: H3_VERSION,
  nitropack: NITRO_VERSION,
}

const expectedDev = {
  '@nuxt/schema': NUXT_VERSION,
  '@nuxt/devtools': '3.4.1',
  '@nuxt/module-builder': '1.0.3',
  '@nuxt/test-utils': NUXT_TEST_UTILS_VERSION,
  '@types/node': NODE_TYPES_VERSION,
  nuxt: NUXT_VERSION,
  vitest: VITEST_VERSION,
  vue: VUE_VERSION,
}

function requireExact(container, name, version, label) {
  const actual = container?.[name]
  if (actual !== version)
    problems.push(`${label} ${name}: expected ${version}, found ${actual ?? 'missing'}`)
}

function requireLockedPackage(name, version) {
  if (!lock.includes(`"${name}@${version}"`))
    problems.push(`${name}: ${version} is missing from bun.lock`)
}

for (const [name, version] of Object.entries(expectedRuntime)) {
  requireExact(pkg.dependencies, name, version, 'root dependency')
  requireLockedPackage(name, version)
}

for (const [name, version] of Object.entries(expectedDev)) {
  requireExact(pkg.devDependencies, name, version, 'root devDependency')
  requireLockedPackage(name, version)
}

requireExact(pkg.overrides, 'vite', VITE_VERSION, 'root override')
requireExact(pkg.overrides, 'rolldown', ROLLDOWN_VERSION, 'root override')
requireExact(pkg.overrides, 'vue', VUE_VERSION, 'root override')
requireLockedPackage('vite', VITE_VERSION)
requireLockedPackage('rolldown', ROLLDOWN_VERSION)

const knexPeerVersion = pkg.peerDependencies?.['@feathersjs/knex']
if (knexPeerVersion !== FEATHERS_VERSION)
  problems.push(`@feathersjs/knex peer: expected ${FEATHERS_VERSION}, found ${knexPeerVersion ?? 'missing'}`)
if (!lock.includes(`"@feathersjs/knex": "${FEATHERS_VERSION}"`))
  problems.push(`@feathersjs/knex peer: ${FEATHERS_VERSION} is missing from bun.lock workspace metadata`)

const knexVersion = pkg.peerDependencies?.knex
if (knexVersion !== KNEX_PEER_VERSION)
  problems.push(`knex peer: expected ${KNEX_PEER_VERSION}, found ${knexVersion ?? 'missing'}`)
if (!lock.includes(`"knex": "${KNEX_PEER_VERSION}"`))
  problems.push(`knex peer: ${KNEX_PEER_VERSION} is missing from bun.lock workspace metadata`)

const staleLockedFeathers = [...lock.matchAll(/"@feathersjs\/[a-z0-9-]+@5\.0\.(?!49\b)\d+"/giu)]
  .map(match => match[0])
if (staleLockedFeathers.length > 0)
  problems.push(`bun.lock contains mixed Feathers v5 package records: ${[...new Set(staleLockedFeathers)].join(', ')}`)

const starterFeathers = starter.dependencies ?? {}
for (const requiredStarterDependency of [
  '@feathersjs/authentication',
  '@feathersjs/authentication-local',
  '@feathersjs/errors',
  '@feathersjs/feathers',
  '@feathersjs/mongodb',
  '@feathersjs/schema',
]) {
  requireExact(starterFeathers, requiredStarterDependency, FEATHERS_VERSION, 'starter dependency')
}

for (const starterOverride of [
  '@feathersjs/adapter-commons',
  '@feathersjs/authentication',
  '@feathersjs/authentication-client',
  '@feathersjs/authentication-local',
  '@feathersjs/authentication-oauth',
  '@feathersjs/commons',
  '@feathersjs/configuration',
  '@feathersjs/errors',
  '@feathersjs/express',
  '@feathersjs/feathers',
  '@feathersjs/generators',
  '@feathersjs/koa',
  '@feathersjs/memory',
  '@feathersjs/mongodb',
  '@feathersjs/rest-client',
  '@feathersjs/schema',
  '@feathersjs/socketio',
  '@feathersjs/socketio-client',
  '@feathersjs/transport-commons',
]) {
  requireExact(starter.overrides, starterOverride, FEATHERS_VERSION, 'starter override')
}
requireExact(starter.overrides, '@feathersjs/hooks', '0.9.0', 'starter override')
requireExact(starter.dependencies, 'nuxt', NUXT_VERSION, 'starter dependency')
requireExact(starter.dependencies, 'vue', VUE_VERSION, 'starter dependency')
requireExact(starter.dependencies, 'nuxt-feathers-zod', pkg.version, 'starter dependency')

for (const [label, example] of [['SPA example', keycloakSpa], ['SSR example', keycloakSsr]]) {
  requireExact(example.dependencies, 'nuxt', NUXT_VERSION, label)
  requireExact(example.dependencies, 'vue', VUE_VERSION, label)
  requireExact(example.dependencies, 'nuxt-feathers-zod', pkg.version, label)
}

const adapterLine = lock.split('\n').find(line => line.includes(`"@vevedh/feathers-nitro": ["@vevedh/feathers-nitro@${FEATHERS_NITRO_VERSION}"`)) ?? ''
for (const [name, range] of [
  ['@feathersjs/feathers', '^5.0.49'],
  ['h3', H3_VERSION],
  ['nitropack', NITRO_VERSION],
]) {
  if (!adapterLine.includes(`"${name}": "${range}"`))
    problems.push(`@vevedh/feathers-nitro ${name}: expected ${range} in bun.lock package metadata`)
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Dependency convergence check failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(
  `[nuxt-feathers-zod] Feathers ${FEATHERS_VERSION}, feathers-nitro ${FEATHERS_NITRO_VERSION}, Nuxt ${NUXT_VERSION}, Vue ${VUE_VERSION}, Vite ${VITE_VERSION}, Nitro ${NITRO_VERSION} and H3 ${H3_VERSION} are converged.`,
)
