#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const pkg = JSON.parse(read('package.json'))
const connections = read('src/runtime/options/database/connections.ts')
const certification = read('scripts/validate-mssql-release.mjs')
const windows = read('scripts/verify-windows.ps1')
const finalizer = read('scripts/finalize-release.mjs')
const publisher = read('scripts/publish-release.mjs')
const doctorTest = read('test/doctor.spec.ts')
const multiDatabaseDocs = [
  'docs/guide/multi-database.md',
  'docs/en/guide/multi-database.md',
].map(relative => [relative, read(relative)])
const cliDocs = [
  'docs/reference/cli.md',
  'docs/guide/cli.md',
  'docs/en/reference/cli.md',
  'docs/en/guide/cli.md',
].map(relative => [relative, read(relative)])
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

const mssqlStart = connections.indexOf('  mssql: {')
const mssqlEnd = connections.indexOf('\n  },\n}', mssqlStart)
const descriptor = mssqlStart >= 0 && mssqlEnd >= 0 ? connections.slice(mssqlStart, mssqlEnd) : ''
requireText(descriptor, "certification: 'certified'", 'MSSQL certified descriptor')
requireText(descriptor, "defaultClient: 'mssql'", 'MSSQL default Knex client')
requireText(descriptor, "driverPackage: 'tedious'", 'MSSQL driver package')
requireText(descriptor, 'poolDefaults: { min: 0, max: 10 }', 'MSSQL pool defaults')
requireText(descriptor, 'schemaNamespaces: true', 'MSSQL schema namespace capability')
requireText(descriptor, 'transactions: true', 'MSSQL transaction capability')
requireText(connections, 'indexManagement: false', 'generic index-management capability remains disabled')
requireText(connections, 'migrations: false', 'generic migrations capability remains disabled')
requireText(connections, 'options.lowerCaseGuids = true', 'MSSQL portable GUID lowercase default')

if (pkg.peerDependencies?.tedious !== '^20.0.0')
  problems.push(`tedious optional peer must be ^20.0.0; found ${pkg.peerDependencies?.tedious ?? 'missing'}`)
if (pkg.peerDependenciesMeta?.tedious?.optional !== true)
  problems.push('tedious must remain an optional peer dependency')

requireText(certification, 'resolveReleaseArtifact', 'exact release candidate resolver')
requireText(certification, "recordArtifactValidation(root, 'mssql'", 'MSSQL artifact validation stamp')
requireText(certification, "mcr.microsoft.com/mssql/server:2025-CU8-ubuntu-22.04", 'pinned SQL Server 2025 CU8 Docker default')
requireText(certification, 'ensureDockerImageAvailable(dockerImage)', 'MSSQL Docker image preflight')
if (certification.includes('mcr.microsoft.com/mssql/server:2025-GA-ubuntu'))
  problems.push('MSSQL certification must not use the unavailable 2025-GA-ubuntu tag')

requireText(certification, 'MSSQL_SA_PASSWORD', 'current SQL Server container password environment')
requireText(certification, "'--env', 'MSSQL_SA_PASSWORD'", 'Docker password environment forwarding')
requireText(certification, 'env: { ...process.env, MSSQL_SA_PASSWORD: password }', 'Docker child password environment')
if (certification.includes('MSSQL_SA_PASSWORD=${password}'))
  problems.push('MSSQL Docker password must not be interpolated into command arguments')
requireText(certification, "const TEDIOUS_VERSION = '20.0.0'", 'exact tedious certification driver')
requireText(certification, 'tedious: TEDIOUS_VERSION', 'MSSQL consumer dependency')
requireText(certification, "client: 'mssql'", 'Knex MSSQL client')
requireText(certification, "driverPackage: 'tedious'", 'NFZ MSSQL driver mapping')
requireText(certification, 'trustServerCertificate: true', 'isolated container TLS trust')
requireText(certification, 'lowerCaseGuids: true', 'Tedious lowercase GUID certification option')
requireText(certification, "serverName: 'localhost'", 'TLS SNI hostname for loopback certification')
requireText(certification, 'assert.equal(user.id, uuid)', 'strict UUID create round-trip')
requireText(certification, 'assert.equal(localResult.user.id, uuid)', 'strict UUID local-auth round-trip')
requireText(certification, 'assert.equal(jwtResult.user.id, uuid)', 'strict UUID JWT re-read round-trip')
requireText(certification, "SERVERPROPERTY('ProductMajorVersion')", 'real SQL Server identity proof')
requireText(certification, "majorVersion >= 17", 'SQL Server 2025 major-version floor')
requireText(certification, "CREATE DATABASE ", 'isolated database creation')
requireText(certification, "CREATE SCHEMA ", 'isolated schema creation')
requireText(certification, "table.increments('id').primary()", 'integer identity evidence')
requireText(certification, "table.uuid('id').primary()", 'UUID authentication entity storage')
requireText(certification, 'zodQuerySyntax', 'portable query parsing')
requireText(certification, "$in: ['4', '6', '8']", '$in query evidence')
requireText(certification, "$sort: { severity: '-1' }", '$sort query evidence')
requireText(certification, "$skip: '1'", '$skip query evidence')
requireText(certification, "$limit: '2'", '$limit query evidence')
requireText(certification, "sys.indexes as i", 'real SQL Server index inspection')
requireText(certification, 'withNfzSqlTransaction', 'DML transaction rollback')
requireText(certification, "strategy: 'local'", 'local authentication evidence')
requireText(certification, "strategy: 'jwt'", 'JWT entity re-read evidence')
requireText(certification, "assert.equal(closed?.state, 'closed')", 'registry lifecycle teardown')
requireText(certification, 'SET SINGLE_USER WITH ROLLBACK IMMEDIATE', 'fail-closed database cleanup')
requireText(certification, 'DROP DATABASE ', 'isolated database teardown')
requireText(certification, "installExactReleaseConsumer({ cwd: workspace, label: 'mssql-cert' })", 'shared resilient exact-candidate consumer install')
if (certification.includes("run('npm', ['install'"))
  problems.push('MSSQL certification must not spawn bare npm directly on Windows')

if (pkg.scripts?.['sanity:mssql-certification'] !== 'node scripts/check-mssql-certification.mjs')
  problems.push('sanity:mssql-certification script is missing')
if (pkg.scripts?.['test:mssql:release'] !== 'node scripts/validate-mssql-release.mjs')
  problems.push('test:mssql:release script is missing')
for (const key of ['release:check', 'verify:sanity', 'prepare:project'])
  requireText(pkg.scripts?.[key] || '', 'bun run sanity:mssql-certification', `${key} MSSQL guard`)
requireText(pkg.scripts?.['release:verify:artifact'] || '', 'bun run test:mssql:release', 'artifact MSSQL validation')
requireText(windows, "Invoke-BunCommand @('run', 'sanity:mssql-certification')", 'Windows MSSQL static guard')
requireText(windows, "Invoke-BunCommand @('run', 'test:mssql:release')", 'Windows exact-candidate MSSQL gate')
requireText(
  finalizer,
  "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']",
  'immutable finalization MSSQL stamp',
)
requireText(
  publisher,
  "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']",
  'publisher MSSQL stamp',
)
requireText(
  doctorTest,
  'enterprise: type=mssql provider=knex databaseFamily=sql certification=certified driver=tedious enabled=true',
  'doctor MSSQL certified expectation',
)
for (const [relativePath, source] of cliDocs) {
  requireText(
    source,
    '--database <mongodb|postgresql|mysql|mariadb|sqlite|mssql>',
    `${relativePath} MSSQL CLI database enum`,
  )
}
for (const [relativePath, source] of multiDatabaseDocs) {
  requireText(source, 'mcr.microsoft.com/mssql/server:2025-CU8-ubuntu-22.04', `${relativePath} pinned MSSQL certification image`)
}

const fullReleaseStart = windows.search(/^if \(\$Full\) \{\r?$/m)
const fullRelease = fullReleaseStart >= 0 ? windows.slice(fullReleaseStart) : ''
const candidateIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'release:candidate')")
const sqliteIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:sqlite:release')")
const mssqlIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:mssql:release')")
const matrixIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:database-matrix:release')")
const starterIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:starter:release')")
const finalizeIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'release:finalize')")
if (candidateIndex < 0 || sqliteIndex < 0 || mssqlIndex < 0 || matrixIndex < 0 || starterIndex < 0 || finalizeIndex < 0
  || sqliteIndex < candidateIndex || mssqlIndex < sqliteIndex
  || matrixIndex < mssqlIndex || starterIndex < matrixIndex || finalizeIndex < starterIndex) {
  problems.push('MSSQL certification must run on the exact candidate after SQLite and before database-matrix/starter/finalization')
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] MSSQL certification guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(
  '[nuxt-feathers-zod] MSSQL certification contract is aligned: exact candidate, SQL Server 2025, '
  + 'canonical lowercase GUIDs, CRUD/auth/query/schema/index/rollback/lifecycle evidence, synchronized CLI docs and candidate-bound stamp.',
)
