#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const problems = []
const read = relative => readFileSync(resolve(root, relative), 'utf8').replace(/\r\n?/g, '\n')
const pkg = JSON.parse(read('package.json'))

function expectContains(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function expectNotContains(source, unexpected, label) {
  if (source.includes(unexpected))
    problems.push(`${label}: stale ${JSON.stringify(unexpected)}`)
}

const capabilities = read('src/runtime/capabilities.ts')
expectContains(capabilities, "providers: ['memory', 'redis']", 'native cache capabilities')
expectContains(capabilities, 'distributed: true', 'native cache distributed capability')
expectContains(capabilities, 'defaultEnabled: false', 'native cache capabilities')
expectContains(capabilities, 'serverOnly: true', 'native cache capabilities')

const cli = read('src/cli/index.ts')
expectContains(cli, "normalized === 'cache'", 'CLI cache capability section')
expectContains(cli, "'databases', 'cache', 'all'", 'CLI capability enum')
expectContains(cli, 'NFZ_MODULE_CAPABILITIES.cache', 'CLI cache capability payload')

const optionsFr = read('docs/reference/options.md')
expectNotContains(optionsFr, "server: {\n  enabled: true,\n  framework: 'express',", 'French server option reference')
for (const stale of ['`modulesDir`', '`serveStaticPath`', '`serveStaticDir`'])
  expectNotContains(optionsFr, stale, 'French server option reference')
expectContains(optionsFr, '`moduleDirs`', 'French server option reference')
expectContains(optionsFr, '`secure.serveStatic`', 'French server option reference')

const configEn = read('docs/en/reference/configuration.md')
expectContains(configEn, 'named MongoDB and SQL connection registry', 'English database summary')

const redisReadme = read('examples/real-world-nuxt4-daisyui-pinia-redis/README.md')
expectContains(redisReadme, 'provider natif `redis`', 'Redis example native-cache boundary')
expectContains(redisReadme, 'Redis et Valkey', 'Redis example engine certification boundary')
expectNotContains(redisReadme, "ne possède pas d'option publique `feathers.cache`", 'Redis example native-cache boundary')

for (const relative of [
  'docs/guide/starter-quasar-unocss-pinia.md',
  'docs/en/guide/starter-quasar-unocss-pinia.md',
  'examples/nfz-quasar-unocss-pinia-starter/README.md',
]) {
  const source = read(relative)
  expectContains(source, 'providers: {', `${relative} auth provider contract`)
  expectContains(source, "type: 'local'", `${relative} local provider contract`)
  expectContains(source, "type: 'jwt'", `${relative} JWT provider contract`)
  expectNotContains(source, "authStrategies: ['local', 'jwt']", `${relative} starter config snapshot`)
}

const starterConfig = read('examples/nfz-quasar-unocss-pinia-starter/nuxt.config.ts')
expectContains(starterConfig, 'providers: {', 'maintained starter real config')

const exportsMap = pkg.exports || {}
const typeMap = pkg.typesVersions?.['*'] || {}
for (const [subpath, target] of Object.entries(exportsMap)) {
  if (subpath === '.' || subpath.includes('*') || !target || typeof target !== 'object')
    continue
  if (typeof target.types === 'string' && !typeMap[subpath.slice(2)])
    problems.push(`package metadata: ${subpath} has exports.types but no matching typesVersions entry`)
}

for (const required of ['capabilities', 'server-console-services']) {
  if (!typeMap[required])
    problems.push(`package metadata: typesVersions missing ${required}`)
}

for (const relative of ['docs/reference/cli.md','docs/en/reference/cli.md','docs/guide/cli.md','docs/en/guide/cli.md']) {
  const source = read(relative)
  expectContains(source, 'summary|runtime|services|client|events|databases|cache|all', `${relative} capabilities enum`)
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Cross-surface contract convergence failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Cross-surface contracts are synchronized: cache, CLI, server options, starter docs, Redis boundary and package type metadata.')
