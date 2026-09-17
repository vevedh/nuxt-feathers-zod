#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const pkg = JSON.parse(read('package.json'))
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function sourceFiles(directory) {
  const absolute = resolve(root, directory)
  const files = []
  for (const entry of readdirSync(absolute)) {
    const candidate = resolve(absolute, entry)
    if (statSync(candidate).isDirectory())
      files.push(...sourceFiles(candidate.slice(root.length + 1)))
    else if (/\.(?:ts|vue)$/.test(entry))
      files.push(candidate)
  }
  return files
}

const index = read('examples/README.md')
for (const name of [
  'minimal-embedded-memory',
  'nfz-quasar-unocss-pinia-starter',
  'remote-rest-minimal',
  'real-world-nuxt4-daisyui-pinia-redis',
  'sql-knex-named-connections',
  'nuxt4-keycloak-ldap-spa-ref',
  'nuxt4-keycloak-ldap-ssr-ref',
]) {
  requireText(index, `./${name}/`, `examples index ${name}`)
}
requireText(index, `nuxt-feathers-zod ${pkg.version}`, 'examples index release version')

for (const relative of [
  'examples/minimal-embedded-memory/package.json',
  'examples/remote-rest-minimal/package.json',
  'examples/nfz-quasar-unocss-pinia-starter/package.json',
  'examples/real-world-nuxt4-daisyui-pinia-redis/package.json',
  'examples/nuxt4-keycloak-ldap-spa-ref/package.json',
  'examples/nuxt4-keycloak-ldap-ssr-ref/package.json',
]) {
  const example = JSON.parse(read(relative))
  if (example.dependencies?.['nuxt-feathers-zod'] !== pkg.version)
    problems.push(`${relative}: nuxt-feathers-zod must match ${pkg.version}`)
}

const memoryConfig = read('examples/minimal-embedded-memory/nuxt.config.ts')
const memoryPage = read('examples/minimal-embedded-memory/app/pages/index.vue')
const memorySchema = read('examples/minimal-embedded-memory/services/messages/messages.schema.ts')
requireText(memoryConfig, "client: { mode: 'embedded' }", 'minimal embedded client mode')
requireText(memoryConfig, "servicesDirs: ['services']", 'minimal embedded service discovery')
requireText(memoryPage, "useService('messages')", 'minimal embedded typed client usage')
requireText(memorySchema, 'zodQuerySyntax', 'minimal embedded query validation')

const remoteConfig = read('examples/remote-rest-minimal/nuxt.config.ts')
requireText(remoteConfig, "mode: 'remote'", 'remote REST mode')
requireText(remoteConfig, "server: { enabled: false }", 'remote REST server disabled')
requireText(remoteConfig, "transport: 'rest'", 'remote REST transport')

const redisExampleConfig = read('examples/real-world-nuxt4-daisyui-pinia-redis/nuxt.config.ts')
const redisExamplePage = read('examples/real-world-nuxt4-daisyui-pinia-redis/app/pages/index.vue')
const redisExamplePlugin = read('examples/real-world-nuxt4-daisyui-pinia-redis/server/plugins/redis-storage.ts')
const redisExampleRoute = read('examples/real-world-nuxt4-daisyui-pinia-redis/server/api/dashboard/summary.get.ts')
const redisExampleReadme = read('examples/real-world-nuxt4-daisyui-pinia-redis/README.md')
requireText(redisExampleConfig, "'daisy-ui-kit/nuxt'", 'DaisyUiKit Nuxt module')
requireText(redisExampleConfig, "mode: 'embedded'", 'DaisyUiKit embedded NFZ client')
requireText(redisExampleConfig, 'runtimeConfig: {', 'DaisyUiKit private runtime config')
requireText(redisExampleConfig, 'redis: {', 'DaisyUiKit private Redis config')
requireText(redisExamplePage, 'Intégrer NFZ + redis cache dans une vraie application Nuxt 4 + DaisyUiKit + Pinia', 'DaisyUiKit promo heading')
requireText(redisExamplePage, 'services métier NFZ + Redis Cache', 'DaisyUiKit promo Redis service claim')
requireText(redisExamplePlugin, "from 'unstorage/drivers/redis'", 'Redis Unstorage driver')
requireText(redisExamplePlugin, "storage.mount('nfz-cache'", 'Redis named storage mount')
requireText(redisExampleRoute, "waitForNfzRuntimeInstance<Application>('default')", 'Redis route NFZ runtime access')
requireText(redisExampleRoute, "role === 'admin' || role === 'member'", 'Redis route RBAC')
requireText(redisExampleRoute, "getItem<Omit<DashboardSummary, 'cache'>>", 'Redis cache read')
requireText(redisExampleRoute, 'setItem(cacheKey, origin, { ttl: ttlSeconds })', 'Redis cache TTL write')
requireText(redisExampleReadme, "ne possède pas d'option publique `feathers.cache`", 'Redis public API boundary')
const redisExampleTsconfig = read('examples/real-world-nuxt4-daisyui-pinia-redis/tsconfig.json')
requireText(redisExampleTsconfig, '"strict": true', 'DaisyUiKit strict TypeScript')
const redisPublicConfig = redisExampleConfig.split('public: {', 2)[1] || ''
if (redisPublicConfig.includes('REDIS_URL'))
  problems.push('DaisyUiKit Redis security: REDIS_URL must not appear under runtimeConfig.public')
for (const absolute of sourceFiles('examples/real-world-nuxt4-daisyui-pinia-redis')) {
  const source = readFileSync(absolute, 'utf8')
  if (/\bas any\b|:\s*any\b/.test(source))
    problems.push(`${absolute.slice(root.length + 1)}: explicit any is forbidden in the strict real-world example`)
}

const sqlConfig = read('examples/sql-knex-named-connections/nuxt.config.ts')
const sqlCompose = read('examples/sql-knex-named-connections/docker-compose.yaml')
const sqlReadme = read('examples/sql-knex-named-connections/README.md')
requireText(sqlConfig, "default: 'postgresql'", 'SQL explicit default connection')
for (const engine of ['postgresql', 'mysql', 'mariadb'])
  requireText(sqlConfig, `type: '${engine}'`, `SQL ${engine} named connection`)
requireText(sqlCompose, 'postgres:18-alpine', 'SQL recipe PostgreSQL image')
requireText(sqlCompose, 'mysql:8.4', 'SQL recipe MySQL image')
requireText(sqlCompose, 'mariadb:11.8', 'SQL recipe MariaDB image')
requireText(sqlReadme, 'schemaNamespaces: false', 'SQL MySQL/MariaDB namespace limitation')
requireText(sqlReadme, 'commits implicites', 'SQL DDL transaction limitation')
requireText(sqlReadme, `nuxt-feathers-zod@${pkg.version}`, 'SQL recipe CLI release version')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Maintained examples guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(
  '[nuxt-feathers-zod] Maintained examples are indexed, version-aligned and cover embedded, ' +
    'remote, DaisyUiKit/Redis integration and certified SQL paths.',
)
