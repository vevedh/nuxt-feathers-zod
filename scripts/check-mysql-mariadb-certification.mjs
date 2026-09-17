#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const pkg = JSON.parse(read('package.json'))
const connections = read('src/runtime/options/database/connections.ts')
const certification = read('scripts/validate-mysql-mariadb-release.mjs')
const windows = read('scripts/verify-windows.ps1')
const finalizer = read('scripts/finalize-release.mjs')
const doctorTest = read('test/doctor.spec.ts')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function descriptorBlock(name, nextName) {
  return connections.slice(
    connections.indexOf(`  ${name}: {`),
    connections.indexOf(`  ${nextName}: {`),
  )
}

for (const [engine, next] of [['mysql', 'mariadb'], ['mariadb', 'sqlite']]) {
  const descriptor = descriptorBlock(engine, next)
  requireText(descriptor, "certification: 'certified'", `${engine} certified descriptor`)
  requireText(descriptor, "defaultClient: 'mysql2'", `${engine} default Knex client`)
  requireText(descriptor, "driverPackage: 'mysql2'", `${engine} driver package`)
  requireText(descriptor, 'schemaNamespaces: false', `${engine} schema namespace capability`)
  requireText(descriptor, 'transactions: true', `${engine} transaction capability`)
}

requireText(certification, 'resolveReleaseArtifact', 'exact release candidate resolver')
requireText(certification, "recordArtifactValidation(root, spec.engine", 'per-engine artifact validation stamp')
requireText(certification, 'NFZ_MYSQL_CERTIFICATION_URL', 'external MySQL override')
requireText(certification, 'NFZ_MARIADB_CERTIFICATION_URL', 'external MariaDB override')
requireText(certification, 'mysql:8.4', 'isolated MySQL Docker default')
requireText(certification, 'mariadb:11.8', 'isolated MariaDB Docker default')
requireText(certification, "const MYSQL2_VERSION = '3.24.4'", 'exact mysql2 certification driver')
requireText(certification, "'@feathersjs/knex': FEATHERS_VERSION", 'Feathers Knex exact consumer')
requireText(
  certification,
  "import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'",
  'Feathers v5 authentication imports',
)
requireText(certification, "app.set('authentication', {", 'Feathers authentication configuration')
requireText(certification, "authService.register('local', localStrategy)", 'local strategy registration')
requireText(certification, 'zodQuerySyntax', 'portable query parsing')
requireText(certification, 'withNfzSqlTransaction', 'DML transaction rollback')
requireText(certification, "information_schema.statistics", 'real index inspection')
requireText(certification, "assert.match(version, /mariadb/i)", 'MariaDB identity proof')
requireText(certification, "assert.doesNotMatch(version, /mariadb/i)", 'MySQL identity proof')
requireText(certification, "table.string('id', 36).primary()", 'portable UUID string storage')
requireText(certification, "strategy: 'jwt'", 'JWT entity re-read')
requireText(certification, "assert.equal(closed?.state, 'closed')", 'registry lifecycle teardown')
requireText(certification, 'dropTableIfExists', 'isolated table teardown')
requireText(certification, "installExactReleaseConsumer({ cwd: workspace, label: 'sql-cert' })", 'shared resilient exact-candidate consumer install')
if (certification.includes("run('npm', ['install'"))
  problems.push('MySQL/MariaDB certification must not spawn bare npm directly on Windows')

const authConfigIndex = certification.indexOf("app.set('authentication', {")
const authServiceIndex = certification.indexOf('const authService = new AuthenticationService(app)')
const localRegisterIndex = certification.indexOf("authService.register('local', localStrategy)")
if (authConfigIndex < 0 || authServiceIndex < 0 || localRegisterIndex < 0
  || authConfigIndex > authServiceIndex || authServiceIndex > localRegisterIndex) {
  problems.push('MySQL/MariaDB certification must set authentication config before constructing/registering strategies')
}

if (pkg.scripts?.['sanity:mysql-mariadb-certification'] !== 'node scripts/check-mysql-mariadb-certification.mjs')
  problems.push('sanity:mysql-mariadb-certification script is missing')
if (pkg.scripts?.['test:mysql-mariadb:release'] !== 'node scripts/validate-mysql-mariadb-release.mjs')
  problems.push('test:mysql-mariadb:release script is missing')
for (const key of ['release:check', 'verify:sanity', 'prepare:project'])
  requireText(pkg.scripts?.[key] || '', 'bun run sanity:mysql-mariadb-certification', `${key} MySQL/MariaDB guard`)
requireText(
  pkg.scripts?.['release:verify:artifact'] || '',
  'bun run test:mysql-mariadb:release',
  'artifact MySQL/MariaDB validation',
)
requireText(
  windows,
  "Invoke-BunCommand @('run', 'sanity:mysql-mariadb-certification')",
  'Windows MySQL/MariaDB static guard',
)
requireText(
  windows,
  "Invoke-BunCommand @('run', 'test:mysql-mariadb:release')",
  'Windows exact-candidate MySQL/MariaDB gate',
)
requireText(
  finalizer,
  "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']",
  'immutable finalization SQL engine stamps',
)
requireText(
  doctorTest,
  'commerce: type=mysql provider=knex databaseFamily=sql certification=certified driver=mysql2 enabled=true',
  'doctor MySQL certified expectation',
)
requireText(
  doctorTest,
  'legacy: type=mariadb provider=knex databaseFamily=sql certification=certified driver=mysql2 enabled=true',
  'doctor MariaDB certified expectation',
)

const fullReleaseStart = windows.search(/^if \(\$Full\) \{\r?$/m)
const fullRelease = fullReleaseStart >= 0 ? windows.slice(fullReleaseStart) : ''
const candidateIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'release:candidate')")
const postgresqlIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:postgresql:release')")
const mysqlMariaIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:mysql-mariadb:release')")
const matrixIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:database-matrix:release')")
const starterIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:starter:release')")
const finalizeIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'release:finalize')")
if (candidateIndex < 0 || postgresqlIndex < 0 || mysqlMariaIndex < 0 || matrixIndex < 0 || starterIndex < 0 || finalizeIndex < 0
  || postgresqlIndex < candidateIndex || mysqlMariaIndex < postgresqlIndex
  || matrixIndex < mysqlMariaIndex || starterIndex < matrixIndex || finalizeIndex < starterIndex) {
  problems.push(
    'MySQL/MariaDB certification must run on the exact candidate after PostgreSQL and before database-matrix/starter/finalization',
  )
}


if (problems.length) {
  console.error('[nuxt-feathers-zod] MySQL/MariaDB certification guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(
  '[nuxt-feathers-zod] MySQL/MariaDB certification contract is aligned: exact candidate, ' +
    'separate real engines, CRUD/auth/query/index/transaction/lifecycle evidence.',
)
