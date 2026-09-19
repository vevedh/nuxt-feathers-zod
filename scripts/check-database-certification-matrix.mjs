import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []
const read = path => readFileSync(resolve(root, path), 'utf8').replace(/\r\n?/g, '\n')
const requireText = (source, needle, label) => {
  if (!source.includes(needle))
    failures.push(`missing ${label}: ${needle}`)
}

const connections = read('src/runtime/options/database/connections.ts')
const capabilities = read('src/runtime/capabilities.ts')
const optionsIndex = read('src/runtime/options/index.ts')
const cli = read('src/cli/index.ts')
const cliReferenceRenderer = read('scripts/lib/cli-reference.ts')
const doctor = read('src/cli/commands/doctor.ts')
const finalizer = read('scripts/finalize-release.mjs')
const publisher = read('scripts/publish-release.mjs')
const windows = read('scripts/verify-windows.ps1')
const matrixValidator = read('scripts/validate-database-matrix-release.mjs')
const packageJson = JSON.parse(read('package.json'))
const frMatrix = read('docs/reference/database-matrix.md')
const enMatrix = read('docs/en/reference/database-matrix.md')
const frCompatibility = read('docs/guide/compatibility-matrix.md')
const enCompatibility = read('docs/en/guide/compatibility-matrix.md')
const frCliReference = read('docs/reference/cli.md')
const frCliGuide = read('docs/guide/cli.md')
const enCliReference = read('docs/en/reference/cli.md')
const enCliGuide = read('docs/en/guide/cli.md')
const releaseEnvExample = read('.env.release.example')

const expectedTypes = ['mongodb', 'postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql']
const expectedDrivers = new Map([
  ['postgresql', 'pg'],
  ['mysql', 'mysql2'],
  ['mariadb', 'mysql2'],
  ['sqlite', 'better-sqlite3'],
  ['mssql', 'tedious'],
])

requireText(
  connections,
  "export type NfzDatabaseConnectionType = 'mongodb' | 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql'",
  'canonical six-engine type union',
)
requireText(connections, 'export function listNfzDatabaseProviderDescriptors()', 'descriptor list API')
requireText(connections, 'indexManagement: false', 'provider-neutral index-management limit')
requireText(connections, 'migrations: false', 'provider-neutral migrations limit')

for (const type of expectedTypes) {
  const start = connections.indexOf(`  ${type}: {`)
  const end = start >= 0 ? connections.indexOf('\n  },', start) : -1
  const block = start >= 0 && end >= 0 ? connections.slice(start, end) : ''
  if (!block)
    failures.push(`database descriptor is missing for ${type}`)
  else {
    requireText(block, "certification: 'certified'", `${type} certified descriptor`)
    if (expectedDrivers.has(type))
      requireText(block, `driverPackage: '${expectedDrivers.get(type)}'`, `${type} driver mapping`)
  }
}

requireText(capabilities, "import { listNfzDatabaseProviderDescriptors } from './options/database'", 'capability matrix import')
requireText(capabilities, 'databaseEngines: listNfzDatabaseProviderDescriptors()', 'capability database matrix')
requireText(optionsIndex, 'getNfzDatabaseProviderDescriptor,', 'public options descriptor export')
if (!packageJson.exports?.['./options'])
  failures.push('package exports is missing ./options for the matrix public descriptor import')
if (!packageJson.exports?.['./server-database'])
  failures.push('package exports is missing ./server-database for the matrix registry import')
requireText(cli, "normalized === 'databases'", 'CLI database capability section')
requireText(cli, "options: ['summary', 'runtime', 'services', 'client', 'events', 'databases', 'all']", 'CLI database capability selector')
requireText(cliReferenceRenderer, 'modes, transports, moteurs de base, services NFZ', 'French generated CLI source-of-truth database wording')
requireText(cliReferenceRenderer, 'modes, transports, database engines, NFZ services', 'English generated CLI source-of-truth database wording')
for (const [path, source, needle] of [
  ['docs/reference/cli.md', frCliReference, 'modes, transports, moteurs de base, services NFZ'],
  ['docs/guide/cli.md', frCliGuide, 'modes, transports, moteurs de base, services NFZ'],
  ['docs/en/reference/cli.md', enCliReference, 'modes, transports, database engines, NFZ services'],
  ['docs/en/guide/cli.md', enCliGuide, 'modes, transports, database engines, NFZ services'],
])
  requireText(source, needle, `${path} generated database capability narrative`)
requireText(doctor, 'database.supportedEngines:', 'doctor supported-engine summary')
requireText(doctor, 'database.certifiedEngines:', 'doctor certified-engine summary')

const requiredValidations = "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']"
requireText(finalizer, requiredValidations, 'finalizer exact-candidate SQL validation set')
requireText(publisher, requiredValidations, 'publisher exact-candidate SQL validation set')
requireText(windows, "Invoke-BunCommand @('run', 'sanity:database-certification-matrix')", 'Windows matrix guard')
requireText(windows, "Invoke-BunCommand @('run', 'test:database-matrix:release')", 'Windows exact-candidate matrix gate')
requireText(matrixValidator, "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql']", 'matrix prerequisite SQL stamps')
requireText(matrixValidator, "recordArtifactValidation(root, 'database-matrix'", 'candidate-bound matrix stamp')
requireText(matrixValidator, "installExactReleaseConsumer({", 'shared resilient matrix consumer install')
requireText(matrixValidator, "label: 'database-matrix'", 'matrix consumer install label')
requireText(matrixValidator, "import { getNfzDatabaseProviderDescriptor } from 'nuxt-feathers-zod/options'", 'matrix public descriptor import')
requireText(matrixValidator, "await writeFile(resolve(workspace, 'candidate-api-surface.mjs'), candidateApiSurfaceSource)", 'matrix exact-candidate public API smoke fixture')
requireText(matrixValidator, "run(process.execPath, ['candidate-api-surface.mjs']", 'matrix exact-candidate public API smoke execution')
requireText(matrixValidator, 'Exact candidate public database API surface passed.', 'matrix public API smoke evidence')
if (matrixValidator.includes('resolveDataBaseOptions'))
  failures.push('database matrix harness must not import internal resolveDataBaseOptions from the public options subpath')
requireText(matrixValidator, "docker', ['image', 'inspect', image]", 'matrix Docker image inspect preflight')
requireText(matrixValidator, "run('docker', ['pull', image], { timeout: DOCKER_IMAGE_PULL_TIMEOUT_MS })", 'matrix bounded Docker image pull')
requireText(matrixValidator, "ensureDockerImageAvailable(MONGO_IMAGE, 'MongoDB', 'NFZ_MATRIX_MONGODB_DOCKER_IMAGE')", 'matrix MongoDB preflight')
requireText(matrixValidator, "ensureDockerImageAvailable(POSTGRES_IMAGE, 'PostgreSQL', 'NFZ_MATRIX_POSTGRESQL_DOCKER_IMAGE')", 'matrix PostgreSQL preflight')
requireText(matrixValidator, "timeout: DOCKER_RUN_TIMEOUT_MS", 'matrix Docker run timeout after preflight')
for (const [marker, label] of [
  ["resolvedBase('documents', 'mongodb')", 'representative MongoDB connection'],
  ["resolvedSql('reporting', 'postgresql'", 'representative PostgreSQL connection'],
  ["resolvedSql(\n      'localCache',\n      'sqlite'", 'representative SQLite connection'],
  ['Promise.all', 'parallel coexistence proof'],
])
  requireText(matrixValidator, marker, label)


for (const key of ['prepare:project', 'release:check', 'verify:sanity']) {
  requireText(packageJson.scripts?.[key] || '', 'bun run sanity:database-certification-matrix', `${key} matrix guard`)
}
if (packageJson.scripts?.['sanity:database-certification-matrix'] !== 'node scripts/check-database-certification-matrix.mjs')
  failures.push('sanity:database-certification-matrix script is missing')

for (const [path, source] of [
  ['docs/reference/database-matrix.md', frMatrix],
  ['docs/en/reference/database-matrix.md', enMatrix],
]) {
  for (const type of expectedTypes)
    requireText(source, `| \`${type}\` |`, `${path} ${type} row`)
  requireText(source, '`indexManagement: false`', `${path} index-management limit`)
  requireText(source, '`migrations: false`', `${path} migration limit`)
  requireText(source, 'postgresql,mysql,mariadb,sqlite,mssql,database-matrix,starter,consumer', `${path} immutable validation chain`)
}

requireText(frMatrix, '  -> database-matrix\n  -> starter exact', 'French authoritative matrix release order')
requireText(enMatrix, '  -> database-matrix\n  -> exact starter', 'English authoritative matrix release order')
requireText(frMatrix, '`mongo:7.0`', 'French matrix MongoDB Docker pin')
requireText(frMatrix, '`postgres:18-alpine`', 'French matrix PostgreSQL Docker pin')
requireText(enMatrix, '`mongo:7.0`', 'English matrix MongoDB Docker pin')
requireText(enMatrix, '`postgres:18-alpine`', 'English matrix PostgreSQL Docker pin')
requireText(releaseEnvExample, '# NFZ_MATRIX_MONGODB_DOCKER_IMAGE=mongo:7.0', 'release env MongoDB matrix image override')
requireText(releaseEnvExample, '# NFZ_MATRIX_POSTGRESQL_DOCKER_IMAGE=postgres:18-alpine', 'release env PostgreSQL matrix image override')
requireText(releaseEnvExample, '# NFZ_MSSQL_DOCKER_IMAGE=mcr.microsoft.com/mssql/server:2025-CU8-ubuntu-22.04', 'release env current MSSQL image pin')
if (releaseEnvExample.includes('2025-GA-ubuntu'))
  failures.push('release env example still references unavailable MSSQL image 2025-GA-ubuntu')

requireText(frCompatibility, 'MSSQL / SQL Server 2025 CU8', 'French MSSQL compatibility row')
requireText(frCompatibility, 'Matrice cross-database certifiée', 'French cross-database certification row')
requireText(enCompatibility, 'MSSQL / SQL Server 2025 CU8', 'English MSSQL compatibility row')
requireText(enCompatibility, 'Certified cross-database matrix', 'English cross-database certification row')

if (failures.length) {
  console.error('[nuxt-feathers-zod] Database certification matrix check failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Database certification matrix is converged: 6/6 engines certified, SQL exact-candidate gates immutable, public limits explicit.')
