#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const connections = readFileSync(resolve(root, 'src/runtime/options/database/connections.ts'), 'utf8')
const registry = readFileSync(resolve(root, 'src/runtime/server/database-registry.ts'), 'utf8')
const sqlProvider = readFileSync(resolve(root, 'src/runtime/server/sql-provider.ts'), 'utf8')
const tests = readFileSync(resolve(root, 'src/runtime/options/database/connections.test.ts'), 'utf8')
const registryTests = readFileSync(resolve(root, 'src/runtime/server/database-registry.test.ts'), 'utf8')
const sqlTests = readFileSync(resolve(root, 'src/runtime/server/sql-provider.test.ts'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const windowsVerifier = readFileSync(resolve(root, 'scripts/verify-windows.ps1'), 'utf8')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function forbidText(source, forbidden, label) {
  if (source.includes(forbidden))
    problems.push(`${label}: forbidden ${JSON.stringify(forbidden)}`)
}

for (const [type, driver] of [
  ['postgresql', 'pg'],
  ['mysql', 'mysql2'],
  ['mariadb', 'mysql2'],
  ['sqlite', 'better-sqlite3'],
]) {
  requireText(connections, `type: '${type}'`, `${type} descriptor`)
  requireText(connections, `driverPackage: '${driver}'`, `${type} driver package`)
}

requireText(connections, 'const DEFAULT_ACQUIRE_CONNECTION_TIMEOUT = 60_000', 'bounded SQL acquisition timeout')
requireText(connections, 'poolDefaults: { min: 0, max: 10 }', 'server SQL pool defaults')
requireText(connections, 'poolDefaults: { min: 0, max: 1 }', 'SQLite pool defaults')
requireText(connections, "type === 'sqlite' && max !== 1", 'SQLite single-connection pool guard')
requireText(connections, 'pool.min <= pool.max', 'pool bounds guard')
requireText(connections, 'must declare driverPackage explicitly', 'custom client driver declaration')
requireText(connections, 'transactions: true', 'SQL transaction capability')
requireText(sqlProvider, 'assertNfzSqlDriverAvailable', 'driver preflight function')
requireText(sqlProvider, "loadPackage('knex')", 'isolated Knex loading')
requireText(sqlProvider, 'buildNfzKnexRuntimeConfig', 'isolated Knex runtime config')
requireText(sqlProvider, "raw.call(client, 'select 1 as nfz_health')", 'SQL health check')
requireText(sqlProvider, 'destroy.call(client)', 'SQL teardown')
requireText(registry, 'return connectNfzSqlProvider(config)', 'registry SQL provider delegation')
requireText(registry, 'withNfzSqlTransaction', 'SQL transaction helper')
requireText(registry, "handle.config.provider !== 'knex'", 'transaction/provider fail-closed guard')
requireText(registry, 'handle.capabilities.transactions', 'transaction capability guard')
requireText(tests, 'normalizes SQL pool defaults and rejects unsafe pool or custom-driver ambiguity', 'pool regression test')
requireText(registryTests, 'runs a transaction on one ready SQL connection and rejects non-SQL targets', 'transaction regression test')
requireText(sqlTests, 'builds a sanitized Knex runtime configuration from normalized SQL options', 'Knex config regression test')
requireText(sqlTests, 'fails closed before Knex startup when the declared SQL driver package is missing', 'missing-driver regression test')

for (const scriptName of ['verify:sanity', 'release:check', 'prepare:project']) {
  requireText(
    String(packageJson.scripts?.[scriptName] || ''),
    'bun run sanity:relational-sql-provider',
    `${scriptName} SQL provider guard`,
  )
}
requireText(windowsVerifier, 'sanity:relational-sql-provider', 'Windows verifier SQL provider guard')

forbidText(registry, 'createRequire(import.meta.url)', 'registry must not load SQL packages directly')
forbidText(registry, "const packageName = 'knex'", 'registry must not own Knex package resolution')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Relational SQL provider foundation guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Relational SQL provider foundation is aligned: explicit drivers, safe pools, teardown, health checks and transactions.')
