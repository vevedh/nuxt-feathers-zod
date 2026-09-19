#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8').replace(/\r\n?/g, '\n')
const pkg = JSON.parse(read('package.json'))
const connections = read('src/runtime/options/database/connections.ts')
const certification = read('scripts/validate-sqlite-release.mjs')
const windows = read('scripts/verify-windows.ps1')
const finalizer = read('scripts/finalize-release.mjs')
const publisher = read('scripts/publish-release.mjs')
const doctorTest = read('test/doctor.spec.ts')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

const sqliteStart = connections.indexOf('  sqlite: {')
const sqliteEnd = connections.indexOf('\n  },\n}', sqliteStart)
const descriptor = sqliteStart >= 0 && sqliteEnd >= 0 ? connections.slice(sqliteStart, sqliteEnd) : ''
requireText(descriptor, "certification: 'certified'", 'SQLite certified descriptor')
requireText(descriptor, "defaultClient: 'better-sqlite3'", 'SQLite default Knex client')
requireText(descriptor, "driverPackage: 'better-sqlite3'", 'SQLite driver package')
requireText(descriptor, 'poolDefaults: { min: 0, max: 1 }', 'SQLite single-connection pool')
requireText(descriptor, 'schemaNamespaces: false', 'SQLite schema namespace capability')
requireText(descriptor, 'transactions: true', 'SQLite transaction capability')
requireText(connections, 'indexManagement: false', 'generic index-management capability remains disabled')
requireText(connections, 'migrations: false', 'generic migrations capability remains disabled')

requireText(certification, 'resolveReleaseArtifact', 'exact release candidate resolver')
requireText(certification, "recordArtifactValidation(root, 'sqlite'", 'SQLite artifact validation stamp')
requireText(certification, "const BETTER_SQLITE3_VERSION = '12.11.1'", 'exact better-sqlite3 certification driver')
requireText(certification, "'@feathersjs/knex': FEATHERS_VERSION", 'Feathers Knex exact consumer')
requireText(certification, "'better-sqlite3': BETTER_SQLITE3_VERSION", 'native SQLite consumer dependency')
requireText(certification, "installExactReleaseConsumer({", 'shared resilient exact-candidate consumer install')
requireText(certification, "'rebuild', 'better-sqlite3', '--foreground-scripts'", 'targeted native driver rebuild')
requireText(certification, 'NFZ_SQLITE_CERTIFICATION_FILE', 'isolated SQLite file path')
requireText(certification, "connection: { filename: databaseFile }", 'file-backed SQLite connection')
requireText(certification, "sqlite_version() AS version", 'real SQLite identity proof')
requireText(certification, "table.increments('id').primary()", 'integer ID evidence')
requireText(certification, 'zodQuerySyntax', 'portable query parsing')
requireText(certification, "$in: ['4', '6', '8']", '$in query evidence')
requireText(certification, "$sort: { severity: '-1' }", '$sort query evidence')
requireText(certification, "$skip: '1'", '$skip query evidence')
requireText(certification, "$limit: '2'", '$limit query evidence')
requireText(certification, 'withNfzSqlTransaction', 'DML transaction rollback')
requireText(certification, "sql('sqlite_master')", 'real SQLite index inspection')
requireText(certification, "table.string('id', 36).primary()", 'portable UUID string storage')
requireText(certification, "strategy: 'jwt'", 'JWT entity re-read')
requireText(certification, 'reopenedRegistry = createRegistry()', 'SQLite file reopen proof')
requireText(certification, "assert.equal(closed?.state, 'closed')", 'primary registry lifecycle teardown')
requireText(certification, "assert.equal(reopenedState?.state, 'closed')", 'reopened registry lifecycle teardown')
requireText(certification, "await rm(databaseFile, { force: false })", 'explicit SQLite file teardown')
requireText(certification, 'SQLite certification file still exists after explicit teardown.', 'fail-closed file teardown')
requireText(certification, "label: 'sqlite-cert'", 'SQLite exact-candidate consumer install label')
if (certification.includes("connection: { filename: ':memory:' }") || certification.includes("filename: ':memory:'"))
  problems.push('SQLite certification must use a real temporary file, never :memory:')
if (certification.includes("run('npm', ['install'"))
  problems.push('SQLite certification must not spawn bare npm directly on Windows')

if (pkg.scripts?.['sanity:sqlite-certification'] !== 'node scripts/check-sqlite-certification.mjs')
  problems.push('sanity:sqlite-certification script is missing')
if (pkg.scripts?.['test:sqlite:release'] !== 'node scripts/validate-sqlite-release.mjs')
  problems.push('test:sqlite:release script is missing')
for (const key of ['release:check', 'verify:sanity', 'prepare:project'])
  requireText(pkg.scripts?.[key] || '', 'bun run sanity:sqlite-certification', `${key} SQLite guard`)
requireText(pkg.scripts?.['release:verify:artifact'] || '', 'bun run test:sqlite:release', 'artifact SQLite validation')
requireText(windows, "Invoke-BunCommand @('run', 'sanity:sqlite-certification')", 'Windows SQLite static guard')
requireText(windows, "Invoke-BunCommand @('run', 'test:sqlite:release')", 'Windows exact-candidate SQLite gate')
requireText(
  finalizer,
  "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']",
  'immutable finalization SQLite stamp',
)
requireText(publisher, "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']", 'publisher SQLite stamp')
requireText(
  doctorTest,
  'localCache: type=sqlite provider=knex databaseFamily=sql certification=certified driver=better-sqlite3 enabled=true',
  'doctor SQLite certified expectation',
)

const fullReleaseStart = windows.search(/^if \(\$Full\) \{\r?$/m)
const fullRelease = fullReleaseStart >= 0 ? windows.slice(fullReleaseStart) : ''
const candidateIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'release:candidate')")
const mysqlMariaIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:mysql-mariadb:release')")
const sqliteIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:sqlite:release')")
const matrixIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:database-matrix:release')")
const starterIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'test:starter:release')")
const finalizeIndex = fullRelease.indexOf("Invoke-BunCommand @('run', 'release:finalize')")
if (candidateIndex < 0 || mysqlMariaIndex < 0 || sqliteIndex < 0 || matrixIndex < 0 || starterIndex < 0 || finalizeIndex < 0
  || mysqlMariaIndex < candidateIndex || sqliteIndex < mysqlMariaIndex
  || matrixIndex < sqliteIndex || starterIndex < matrixIndex || finalizeIndex < starterIndex) {
  problems.push('SQLite certification must run on the exact candidate after MySQL/MariaDB and before database-matrix/starter/finalization')
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] SQLite certification guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(
  '[nuxt-feathers-zod] SQLite certification contract is aligned: exact candidate, real file, '
  + 'CRUD/auth/query/index/rollback/close-reopen persistence and fail-closed teardown evidence.',
)
