#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const options = readFileSync(resolve(root, 'src/runtime/options/database/index.ts'), 'utf8')
const registry = readFileSync(resolve(root, 'src/runtime/server/database-registry.ts'), 'utf8')
const cli = readFileSync(resolve(root, 'src/cli/core.ts'), 'utf8')
const databaseTemplate = readFileSync(resolve(root, 'src/runtime/templates/server/database.ts'), 'utf8')
const publicOptions = readFileSync(resolve(root, 'src/runtime/options/index.ts'), 'utf8')
const builderClient = readFileSync(resolve(root, 'src/runtime/composables/useBuilderClient.ts'), 'utf8')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

requireText(options, 'connections?: Record<string, NfzDatabaseConnectionOptions>', 'database options')
requireText(options, 'database.mongo cannot be combined with database.connections.default', 'legacy compatibility')
requireText(options, 'expose the same management basePath', 'MongoDB management path collision guard')
requireText(registry, 'createNfzDatabaseRegistry', 'database registry')
requireText(registry, 'registerMongoManagementServices', 'MongoDB management')
requireText(registry, 'createRequire(import.meta.url)', 'Knex lazy loading')
requireText(registry, "const packageName = 'knex'", 'Knex optional package resolution')
requireText(registry, 'sanitizeError', 'redacted diagnostics')
requireText(registry, 'Database startup failed and one or more opened connections could not be rolled back cleanly.', 'startup rollback')
requireText(registry, 'Database infrastructure failed and one or more connections could not be closed cleanly.', 'infrastructure cleanup')
requireText(registry, "handle.state !== 'ready' && handle.state !== 'connecting'", 'failed-state preserving shutdown')
requireText(registry, "app.set('mongodbClient'", 'legacy MongoDB aliases')
requireText(cli, "'server/database.ts'", 'database template override key')
requireText(cli, "adapter === 'knex'", 'Knex service generator')
requireText(cli, 'getNfzKnexClient', 'named Knex service selection')
requireText(cli, 'getNfzMongoDatabase', 'named MongoDB service selection')
requireText(databaseTemplate, "from 'nuxt-feathers-zod/server-database'", 'server database template export')
requireText(publicOptions, 'const publicConnections', 'public database metadata')
requireText(publicOptions, "databaseConnections: 'nfz/database-connections'", 'public diagnostics service metadata')
requireText(builderClient, 'getDatabaseConnections', 'builder database diagnostics helper')
requireText(builderClient, 'checkDatabaseConnection', 'builder database health helper')

if (!pkg.exports?.['./server-database'])
  problems.push('package.json must export ./server-database')
if (!pkg.typesVersions?.['*']?.['server-database'])
  problems.push('package.json typesVersions must expose server-database')
for (const name of ['@feathersjs/knex', 'knex', 'pg', 'mysql2', 'better-sqlite3']) {
  if (!pkg.peerDependencies?.[name])
    problems.push(`optional SQL peer is missing: ${name}`)
  if (pkg.peerDependenciesMeta?.[name]?.optional !== true)
    problems.push(`SQL peer must be optional: ${name}`)
}

const publicSection = publicOptions.slice(publicOptions.indexOf('export function resolvePublicRuntimeConfig'))
if (/connection:\s*connection\.connection/.test(publicSection) || /url:\s*connection\.url/.test(publicSection))
  problems.push('public runtime database metadata must not expose connection strings')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Multi-database registry guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Multi-database registry, compatibility aliases and redacted diagnostics are aligned.')
