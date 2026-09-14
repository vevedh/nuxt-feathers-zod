#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const pkg = JSON.parse(read('package.json'))
const connections = read('src/runtime/options/database/connections.ts')
const certification = read('scripts/validate-postgresql-release.mjs')
const windows = read('scripts/verify-windows.ps1')
const finalizer = read('scripts/finalize-release.mjs')
const doctorTest = read('test/doctor.spec.ts')
const runtimeSingleFileExample = read('examples/nfz-runtime-single-file.app.ts')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

const postgresqlDescriptor = connections.slice(
  connections.indexOf('  postgresql: {'),
  connections.indexOf('  mysql: {'),
)
requireText(postgresqlDescriptor, "certification: 'certified'", 'PostgreSQL certified descriptor')
requireText(postgresqlDescriptor, "defaultClient: 'pg'", 'PostgreSQL default Knex client')
requireText(postgresqlDescriptor, "driverPackage: 'pg'", 'PostgreSQL driver package')
requireText(postgresqlDescriptor, 'schemaNamespaces: true', 'PostgreSQL schema namespace capability')
requireText(postgresqlDescriptor, 'transactions: true', 'PostgreSQL transaction capability')

requireText(certification, 'resolveReleaseArtifact', 'exact release candidate resolver')
requireText(certification, "recordArtifactValidation(root, 'postgresql'", 'PostgreSQL artifact validation stamp')
requireText(certification, 'NFZ_POSTGRESQL_CERTIFICATION_URL', 'external PostgreSQL override')
requireText(certification, 'postgres:18-alpine', 'isolated PostgreSQL Docker default')
requireText(certification, "'@feathersjs/knex': FEATHERS_VERSION", 'Feathers Knex exact consumer')
requireText(certification, "import { AuthenticationService, JWTStrategy } from '@feathersjs/authentication'", 'Feathers v5 authentication imports')
if (certification.includes('JWTStrategy, authentication') || certification.includes('AuthenticationService, JWTStrategy, authentication'))
  problems.push('PostgreSQL certification must not import the nonexistent Feathers v5 authentication plugin export')
if (certification.includes('app.configure(authentication('))
  problems.push('PostgreSQL certification must not configure the removed/nonexistent Feathers v5 authentication helper')
const authConfigIndex = certification.indexOf("app.set('authentication', {")
const authServiceIndex = certification.indexOf('const authService = new AuthenticationService(app)')
const localRegisterIndex = certification.indexOf("authService.register('local', localStrategy)")
if (authConfigIndex < 0 || authServiceIndex < 0 || localRegisterIndex < 0
  || authConfigIndex > authServiceIndex || authServiceIndex > localRegisterIndex) {
  problems.push('PostgreSQL certification must set authentication config before constructing/registering strategies')
}
requireText(certification, "const KNEX_VERSION = '3.2.10'", 'Knex peer-compatible exact consumer')
requireText(certification, 'knex: KNEX_VERSION', 'Knex exact consumer dependency')
requireText(certification, 'pg: PG_PACKAGE_VERSION', 'PostgreSQL driver exact consumer')
requireText(certification, 'resolveNpmCliPath', 'portable npm CLI resolver')
requireText(certification, "process.platform === 'win32' ? 'npm.cmd' : 'npm'", 'Windows npm command fallback')
requireText(certification, "shell: !npmCliPath && process.platform === 'win32'", 'Windows npm shell fallback')
if (certification.includes("run('npm', ['install'"))
  problems.push('PostgreSQL certification must not spawn bare npm directly on Windows')
requireText(certification, "certification: 'certified'", 'certified runtime diagnostics')
requireText(certification, "app.use('audit-events'", 'real PostgreSQL CRUD service')
requireText(certification, "app.use('users'", 'real PostgreSQL auth entity service')
requireText(certification, 'zodQuerySyntax', 'portable query parsing against PostgreSQL')
requireText(certification, 'withNfzSqlTransaction', 'real PostgreSQL transaction rollback')
requireText(certification, "table.index(['category', 'severity']", 'real PostgreSQL index setup')
requireText(certification, "DROP SCHEMA ?? CASCADE", 'isolated schema teardown')
requireText(certification, "strategy: 'jwt'", 'JWT entity re-read against PostgreSQL')
requireText(certification, "assert.equal(closed?.state, 'closed')", 'database lifecycle teardown')

if (pkg.peerDependencies?.knex !== '^3.2.10')
  problems.push(`knex peer must be ^3.2.10 to satisfy @feathersjs/knex 5.0.49; found ${pkg.peerDependencies?.knex ?? 'missing'}`)

if (pkg.scripts?.['sanity:postgresql-certification'] !== 'node scripts/check-postgresql-certification.mjs')
  problems.push('sanity:postgresql-certification script is missing')
if (pkg.scripts?.['test:postgresql:release'] !== 'node scripts/validate-postgresql-release.mjs')
  problems.push('test:postgresql:release script is missing')
requireText(pkg.scripts?.['release:check'] || '', 'bun run sanity:postgresql-certification', 'release:check PostgreSQL guard')
requireText(pkg.scripts?.['verify:sanity'] || '', 'bun run sanity:postgresql-certification', 'verify:sanity PostgreSQL guard')
requireText(pkg.scripts?.['prepare:project'] || '', 'bun run sanity:postgresql-certification', 'prepare:project PostgreSQL guard')
requireText(pkg.scripts?.['release:verify:artifact'] || '', 'bun run test:postgresql:release', 'artifact PostgreSQL validation')
requireText(windows, "Invoke-BunCommand @('run', 'sanity:postgresql-certification')", 'Windows PostgreSQL static guard')
requireText(windows, "Invoke-BunCommand @('run', 'test:postgresql:release')", 'Windows exact-candidate PostgreSQL gate')
requireText(finalizer, "['postgresql', 'starter', 'consumer']", 'immutable finalization PostgreSQL stamp')
requireText(doctorTest, 'reporting: type=postgresql provider=knex databaseFamily=sql certification=certified driver=pg enabled=true', 'doctor PostgreSQL certified expectation')
if (doctorTest.includes('reporting: type=postgresql provider=knex databaseFamily=sql certification=implemented driver=pg enabled=true'))
  problems.push('doctor PostgreSQL expectation is stale: certified engines must not be asserted as implemented')
if (runtimeSingleFileExample.includes('JWTStrategy, authentication') || runtimeSingleFileExample.includes('app.configure(authentication('))
  problems.push('single-file Feathers v5 example still uses the nonexistent authentication helper export')
const exampleConfigIndex = runtimeSingleFileExample.indexOf("app.set('authentication', {")
const exampleAuthServiceIndex = runtimeSingleFileExample.indexOf('const auth = new AuthenticationService(app)')
if (exampleConfigIndex < 0 || exampleAuthServiceIndex < 0 || exampleConfigIndex > exampleAuthServiceIndex)
  problems.push('single-file Feathers v5 example must set authentication config before constructing strategies')

const candidateIndex = windows.indexOf("Invoke-BunCommand @('run', 'release:candidate')")
const postgresqlIndex = windows.indexOf("Invoke-BunCommand @('run', 'test:postgresql:release')")
const finalizeIndex = windows.indexOf("Invoke-BunCommand @('run', 'release:finalize')")
if (candidateIndex < 0 || postgresqlIndex < 0 || finalizeIndex < 0
  || postgresqlIndex < candidateIndex || postgresqlIndex > finalizeIndex) {
  problems.push('PostgreSQL release certification must run after candidate creation and before finalization')
}


if (problems.length) {
  console.error('[nuxt-feathers-zod] PostgreSQL certification guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] PostgreSQL certification contract is aligned: exact candidate, real CRUD/auth/query/schema/index/transaction/lifecycle evidence.')
