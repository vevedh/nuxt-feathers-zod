import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const optionTests = read('src/runtime/options/index.test.ts')
const publicOptions = read('src/runtime/options/index.ts')
const databaseRegistry = read('src/runtime/server/database-registry.ts')
const databaseTemplateTest = read('src/runtime/templates/server/database.test.ts')
const starterRelease = read('scripts/validate-starter-release.mjs')
const starterReleaseInstaller = read('scripts/lib/starter-release-installer.mjs')
const starterReleaseInstallGuard = read('scripts/check-starter-release-install-resilience.mjs')
const starterPublishedTypes = read('scripts/check-starter-published-types.mjs')
const starterQuasarCompat = read('scripts/check-starter-quasar-compat.mjs')
const starterReleaseRuntime = read('scripts/check-starter-release-runtime.mjs')
const starterReleaseMongo = read('scripts/lib/starter-release-mongodb.mjs')
const windowsInstaller = read('scripts/install-windows.mjs')
const windowsInstallVerification = read('scripts/lib/windows-install-verification.mjs')
const windowsVerifier = read('scripts/verify-windows.ps1')
const postgresqlCertificationGuard = read('scripts/check-postgresql-certification.mjs')
const mysqlMariaCertificationGuard = read('scripts/check-mysql-mariadb-certification.mjs')
const sqliteCertificationGuard = read('scripts/check-sqlite-certification.mjs')
const mssqlCertificationGuard = read('scripts/check-mssql-certification.mjs')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

requireText(optionTests, 'pub.builder?.services?.databaseConnections', 'strict Builder metadata assertion')
requireText(optionTests, "transports: { rest: { framework: 'express', path: '/feathers' }, websocket: false }", 'database metadata fixture transport')
requireText(publicOptions, 'const database = options.database', 'defensive public database projection')
requireText(publicOptions, 'Object.values(database?.connections ?? {})', 'defensive named connection projection')
requireText(databaseRegistry, "handle.state !== 'ready' && handle.state !== 'connecting'", 'failed-state preserving close policy')
requireText(databaseTemplateTest, 'ts.createSourceFile(', 'declaration template syntax parser')
requireText(databaseTemplateTest, "if (!fileName.endsWith('.d.ts'))", 'declaration transpile exclusion')
requireText(starterRelease, 'const bun = requireBunExecutable()', 'starter Bun executable resolution')
requireText(starterRelease, 'installStarterReleaseDependencies', 'resilient starter dependency installer')
requireText(starterRelease, 'resolveReleaseArtifact(root)', 'exact release candidate resolution')
requireText(starterRelease, "recordArtifactValidation(root, 'starter'", 'starter candidate validation stamp')
requireText(starterRelease, "['prepare', 'typecheck', 'build', 'runtime:doctor', 'e2e:ci']", 'explicit starter lifecycle after ignore-scripts install')
requireText(starterRelease, 'mongoRuntime = await provisionStarterReleaseMongo()', 'autonomous starter MongoDB provisioning')
requireText(starterRelease, 'await mongoRuntime?.stop()', 'starter MongoDB cleanup')
requireText(starterReleaseMongo, "const MODES = new Set(['auto', 'external', 'memory'])", 'starter MongoDB validation modes')
requireText(starterReleaseMongo, "await import('mongodb-memory-server')", 'isolated starter MongoDB fallback')
requireText(starterReleaseInstaller, "'--ignore-scripts'", 'starter lifecycle suppression during extraction')
requireText(starterReleaseInstaller, "'--no-cache'", 'starter isolated no-cache rescue')
requireText(starterReleaseInstaller, 'resolveNetworkConcurrency', 'starter adaptive retry concurrency')
requireText(starterReleaseInstallGuard, 'frozenVerification=true', 'starter frozen-lockfile resilience smoke')
requireText(starterPublishedTypes, 'mongodbClient?: Promise<Db>', 'published starter MongoDB configuration contract')
requireText(starterPublishedTypes, 'AroundHookFunction & HookFunction', 'published starter hybrid auth hook contract')
requireText(starterQuasarCompat, "'nuxt-quasar-ui': '3.1.1'", 'Nuxt 4 Quasar bridge baseline')
requireText(starterQuasarCompat, "quasar: '2.31.0'", 'Quasar 2 starter baseline')
requireText(starterReleaseRuntime, "const authSecret = randomBytes(48).toString('base64url')", 'ephemeral starter release auth secret guard')
requireText(starterReleaseRuntime, 'NFZ_AUTH_SECRET: authSecret', 'starter production auth secret injection guard')
requireText(windowsInstaller, "resolve(stateRoot, 'shared-cache')", 'reusable Windows install cache')
requireText(windowsInstaller, 'install-state.json', 'verified Windows install state')
requireText(windowsInstaller, 'resolveNetworkConcurrency(attempt', 'adaptive Windows network concurrency')
requireText(windowsInstaller, "process.argv.includes('--check')", 'Windows install check-only mode')
requireText(windowsInstaller, 'verifyWindowsInstall({ root })', 'entry-point based post-install verification')
requireText(windowsInstallVerification, "await import(specifier)", 'public entry-point runtime probes')
requireText(windowsVerifier, '$SkipInstall', 'Windows verification skip-install mode')
requireText(windowsVerifier, 'scripts/print-bun-executable.mjs', 'PowerShell Bun executable resolution')
requireText(windowsVerifier, 'sanity:starter-release-install-resilience', 'PowerShell starter install resilience guard')
requireText(windowsVerifier, 'sanity:starter-published-types', 'PowerShell published starter type guard')
requireText(windowsVerifier, 'sanity:starter-quasar-compat', 'PowerShell starter Quasar compatibility guard')
requireText(windowsVerifier, 'sanity:starter-release-runtime', 'PowerShell starter production runtime guard')
requireText(windowsVerifier, 'sanity:generated-template-types', 'PowerShell generated handler syntax guard')
requireText(windowsVerifier, 'sanity:zod-boundary', 'PowerShell Nitro Zod runtime guard')
requireText(windowsVerifier, 'sanity:portable-identifiers', 'PowerShell portable identifier guard')
requireText(windowsVerifier, 'sanity:postgresql-certification', 'PowerShell PostgreSQL certification guard')
requireText(windowsVerifier, 'test:postgresql:release', 'PowerShell exact-candidate PostgreSQL certification gate')
requireText(windowsVerifier, 'sanity:mysql-mariadb-certification', 'PowerShell MySQL/MariaDB certification guard')
requireText(
  windowsVerifier,
  'test:mysql-mariadb:release',
  'PowerShell exact-candidate MySQL/MariaDB certification gate',
)
requireText(windowsVerifier, 'sanity:sqlite-certification', 'PowerShell SQLite certification guard')
requireText(windowsVerifier, 'test:sqlite:release', 'PowerShell exact-candidate SQLite certification gate')
requireText(windowsVerifier, 'sanity:mssql-certification', 'PowerShell MSSQL certification guard')
requireText(windowsVerifier, 'sanity:database-certification-matrix', 'PowerShell database certification matrix guard')
requireText(windowsVerifier, 'test:mssql:release', 'PowerShell exact-candidate MSSQL certification gate')
requireText(windowsVerifier, 'test:database-matrix:release', 'PowerShell exact-candidate database matrix gate')
requireText(windowsVerifier, 'sanity:release-lint-regressions', 'PowerShell early release lint guard')
requireText(windowsVerifier, 'sanity:release-typecheck-regressions', 'PowerShell early release TypeScript guard')
requireText(windowsVerifier, 'sanity:release-docker', 'PowerShell early Docker Engine preflight')
requireText(windowsVerifier, '$ResumeCandidate', 'PowerShell immutable candidate resume mode')
requireText(windowsVerifier, '$ModeSwitch.IsPresent', 'PowerShell SwitchParameter-safe mode counting')
requireText(windowsVerifier, 'if ($ModeSwitchCount -gt 1)', 'PowerShell exclusive release mode guard')
if (windowsVerifier.includes('[int]$Full') || windowsVerifier.includes('[int]$Quick') || windowsVerifier.includes('[int]$ResumeCandidate'))
  problems.push('PowerShell release mode guard must not cast SwitchParameter values directly to Int32')
requireText(windowsVerifier, 'scripts/check-release-candidate-state.mjs --has-validation', 'candidate-bound stamp reuse')
requireText(windowsVerifier, "Invoke-BunCommand @('run', 'release:candidate')", 'single candidate creation')
requireText(windowsVerifier, "Invoke-BunCommand @('run', 'release:finalize')", 'final artifact promotion')

for (const [label, source] of [
  ['PostgreSQL', postgresqlCertificationGuard],
  ['MySQL/MariaDB', mysqlMariaCertificationGuard],
  ['SQLite', sqliteCertificationGuard],
  ['MSSQL', mssqlCertificationGuard],
]) {
  requireText(source, 'const fullReleaseStart = windows.search(', `${label} certification guard full-branch anchor`)
  requireText(source, 'const fullRelease = fullReleaseStart >= 0 ? windows.slice(fullReleaseStart) :', `${label} certification guard full-branch slice`)
  if (source.includes('const candidateIndex = windows.indexOf('))
    problems.push(`${label} certification guard must not compare release ordering against the whole PowerShell source`)
}

const starterQuasarIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:starter-quasar-compat')")
const starterRuntimeIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:starter-release-runtime')")
const generatedTemplateIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:generated-template-types')")
const zodBoundaryIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:zod-boundary')")
const postgresqlGuardIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:postgresql-certification')")
const mysqlMariaGuardIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:mysql-mariadb-certification')")
const sqliteGuardIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:sqlite-certification')")
const mssqlGuardIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:mssql-certification')")
const databaseMatrixGuardIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:database-certification-matrix')")
const lintRegressionIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:release-lint-regressions')")
const lintIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'lint')")
if (starterQuasarIndex < 0 || lintIndex < 0 || starterQuasarIndex > lintIndex)
  problems.push('Windows starter Quasar compatibility guard must run before ESLint')

if (starterRuntimeIndex < 0 || lintIndex < 0 || starterRuntimeIndex > lintIndex)
  problems.push('Windows starter production runtime guard must run before ESLint')

if (generatedTemplateIndex < 0 || lintIndex < 0 || generatedTemplateIndex > lintIndex)
  problems.push('Windows generated handler syntax guard must run before ESLint')

if (zodBoundaryIndex < 0 || lintIndex < 0 || zodBoundaryIndex > lintIndex)
  problems.push('Windows Nitro Zod runtime guard must run before ESLint')

if (postgresqlGuardIndex < 0 || lintIndex < 0 || postgresqlGuardIndex > lintIndex)
  problems.push('Windows PostgreSQL certification guard must run before ESLint')

if (mysqlMariaGuardIndex < 0 || lintIndex < 0 || mysqlMariaGuardIndex > lintIndex)
  problems.push('Windows MySQL/MariaDB certification guard must run before ESLint')

if (sqliteGuardIndex < 0 || lintIndex < 0 || sqliteGuardIndex > lintIndex)
  problems.push('Windows SQLite certification guard must run before ESLint')

if (mssqlGuardIndex < 0 || lintIndex < 0 || mssqlGuardIndex > lintIndex)
  problems.push('Windows MSSQL certification guard must run before ESLint')

if (databaseMatrixGuardIndex < 0 || lintIndex < 0 || databaseMatrixGuardIndex > lintIndex)
  problems.push('Windows database certification matrix guard must run before ESLint')

if (lintRegressionIndex < 0 || lintIndex < 0 || lintRegressionIndex > lintIndex)
  problems.push('Windows release lint regression guard must run before ESLint')

const feathersNitroIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:feathers-nitro')")
const dependencyConvergenceIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:dependency-convergence')")
if (feathersNitroIndex < 0 || dependencyConvergenceIndex < 0 || lintIndex < 0
  || feathersNitroIndex > lintIndex || dependencyConvergenceIndex > lintIndex) {
  problems.push('Windows release dependency convergence guards must run before lint')
}


const dockerPreflightIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:release-docker')")
const cleanRepoIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'clean:repo')")
if (dockerPreflightIndex < 0 || cleanRepoIndex < 0 || dockerPreflightIndex > cleanRepoIndex)
  problems.push('Docker Engine preflight must run before expensive source/docs/browser release work')

const candidateIndex = windowsVerifier.lastIndexOf("Invoke-BunCommand @('run', 'release:candidate')")
const postgresqlReleaseIndex = windowsVerifier.lastIndexOf("Invoke-BunCommand @('run', 'test:postgresql:release')")
const mysqlMariaReleaseIndex = windowsVerifier.lastIndexOf("Invoke-BunCommand @('run', 'test:mysql-mariadb:release')")
const sqliteReleaseIndex = windowsVerifier.lastIndexOf("Invoke-BunCommand @('run', 'test:sqlite:release')")
const mssqlReleaseIndex = windowsVerifier.lastIndexOf("Invoke-BunCommand @('run', 'test:mssql:release')")
const databaseMatrixReleaseIndex = windowsVerifier.lastIndexOf("Invoke-BunCommand @('run', 'test:database-matrix:release')")
const finalizeIndex = windowsVerifier.lastIndexOf("Invoke-BunCommand @('run', 'release:finalize')")
if (candidateIndex < 0 || postgresqlReleaseIndex < 0 || mysqlMariaReleaseIndex < 0 || sqliteReleaseIndex < 0 || mssqlReleaseIndex < 0 || databaseMatrixReleaseIndex < 0 || finalizeIndex < 0
  || postgresqlReleaseIndex < candidateIndex || mysqlMariaReleaseIndex < postgresqlReleaseIndex
  || sqliteReleaseIndex < mysqlMariaReleaseIndex || mssqlReleaseIndex < sqliteReleaseIndex
  || databaseMatrixReleaseIndex < mssqlReleaseIndex || databaseMatrixReleaseIndex > finalizeIndex) {
  problems.push('exact-candidate SQL certification must run PostgreSQL then MySQL/MariaDB then SQLite then MSSQL then database matrix before finalization')
}

const typecheckRegressionIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'sanity:release-typecheck-regressions')")
const typecheckIndex = windowsVerifier.indexOf("Invoke-BunCommand @('run', 'typecheck')")
if (typecheckRegressionIndex < 0 || typecheckIndex < 0 || typecheckRegressionIndex > typecheckIndex)
  problems.push('Windows release TypeScript regression guard must run before typecheck')

if (packageJson.scripts?.['install:windows'] !== 'node scripts/install-windows.mjs')
  problems.push('install:windows script is missing')
if (packageJson.scripts?.['docs:build']?.includes('cd docs && bun install'))
  problems.push('public docs build still uses the shared Bun cache directly')
if (packageJson.scripts?.['docs:private:build']?.includes('cd docs-private && bun install'))
  problems.push('private docs build still uses the shared Bun cache directly')
if (packageJson.scripts?.['verify:release:windows'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -Full')
  problems.push('complete fail-fast Windows release gate is missing')
if (packageJson.scripts?.['verify:release:windows:skip-install'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -Full -SkipInstall')
  problems.push('complete Windows release gate skip-install mode is missing')
if (packageJson.scripts?.['verify:release:windows:resume'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -ResumeCandidate')
  problems.push('immutable candidate Windows resume mode is missing')
if (packageJson.scripts?.['sanity:release-docker'] !== 'node scripts/check-release-docker-preflight.mjs')
  problems.push('early release Docker preflight script is missing')
if (packageJson.scripts?.['sanity:release-consumer-install-resilience'] !== 'node scripts/check-release-consumer-install-resilience.mjs')
  problems.push('exact-candidate consumer install resilience guard is missing')
if (packageJson.scripts?.['sanity:release-git-sync'] !== 'node scripts/check-release-git-sync-regressions.mjs')
  problems.push('release Git synchronization regression guard is missing')
if (packageJson.scripts?.['release:git:check'] !== 'node scripts/check-release-git-sync.mjs')
  problems.push('release Git synchronization preflight is missing')
if (packageJson.scripts?.['release:git:check:tagged'] !== 'node scripts/check-release-git-sync.mjs --tagged')
  problems.push('tagged release Git synchronization preflight is missing')
if (!packageJson.scripts?.['publish:npm']?.startsWith('bun run release:git:check:tagged &&'))
  problems.push('publish:npm must fail closed on tagged Git source synchronization before registry/artifact publication')
if (!windowsVerifier.includes("Invoke-BunCommand @('run', 'sanity:release-consumer-install-resilience')"))
  problems.push('Windows verification must execute the exact-candidate consumer install resilience guard')
for (const chain of ['prepare:project', 'release:check', 'verify:sanity']) {
  if (!packageJson.scripts?.[chain]?.includes('bun run sanity:release-consumer-install-resilience'))
    problems.push(`${chain} must run the exact-candidate consumer install resilience guard`)
}
for (const chain of ['prepare:project', 'release:check', 'verify:sanity']) {
  if (!packageJson.scripts?.[chain]?.includes('bun run sanity:release-git-sync'))
    problems.push(`${chain} must run the release Git synchronization regression smoke`)
}
if (packageJson.scripts?.['sanity:portable-identifiers'] !== 'node scripts/check-portable-identifiers.mjs')
  problems.push('portable identifier sanity guard is missing')
if (packageJson.scripts?.['sanity:postgresql-certification'] !== 'node scripts/check-postgresql-certification.mjs')
  problems.push('PostgreSQL certification sanity guard is missing')
if (packageJson.scripts?.['test:postgresql:release'] !== 'node scripts/validate-postgresql-release.mjs')
  problems.push('exact-candidate PostgreSQL certification script is missing')
if (
  packageJson.scripts?.['sanity:mysql-mariadb-certification']
  !== 'node scripts/check-mysql-mariadb-certification.mjs'
)
  problems.push('MySQL/MariaDB certification sanity guard is missing')
if (packageJson.scripts?.['test:mysql-mariadb:release'] !== 'node scripts/validate-mysql-mariadb-release.mjs')
  problems.push('exact-candidate MySQL/MariaDB certification script is missing')
if (packageJson.scripts?.['sanity:sqlite-certification'] !== 'node scripts/check-sqlite-certification.mjs')
  problems.push('SQLite certification sanity guard is missing')
if (packageJson.scripts?.['test:sqlite:release'] !== 'node scripts/validate-sqlite-release.mjs')
  problems.push('exact-candidate SQLite certification script is missing')
if (packageJson.scripts?.['sanity:database-certification-matrix'] !== 'node scripts/check-database-certification-matrix.mjs')
  problems.push('database certification matrix sanity guard is missing')
if (packageJson.scripts?.['sanity:mssql-certification'] !== 'node scripts/check-mssql-certification.mjs')
  problems.push('MSSQL certification sanity guard is missing')
if (packageJson.scripts?.['test:mssql:release'] !== 'node scripts/validate-mssql-release.mjs')
  problems.push('exact-candidate MSSQL certification script is missing')
if (packageJson.scripts?.['test:database-matrix:release'] !== 'node scripts/validate-database-matrix-release.mjs')
  problems.push('exact-candidate database matrix certification script is missing')
if (packageJson.scripts?.['sanity:windows-install-retry'] !== 'node scripts/check-windows-install-retry-policy.mjs')
  problems.push('adaptive Windows install retry guard is missing')
if (packageJson.scripts?.['sanity:windows-install-verification'] !== 'node scripts/check-windows-install-verification.mjs')
  problems.push('Windows post-install verification guard is missing')
if (packageJson.scripts?.['sanity:starter-release-install-resilience'] !== 'node scripts/check-starter-release-install-resilience.mjs')
  problems.push('starter release install resilience guard is missing')
if (packageJson.scripts?.['sanity:starter-published-types'] !== 'node scripts/check-starter-published-types.mjs')
  problems.push('published starter type guard is missing')
if (packageJson.scripts?.['sanity:starter-quasar-compat'] !== 'node scripts/check-starter-quasar-compat.mjs')
  problems.push('starter Quasar compatibility guard is missing')
if (!packageJson.scripts?.['release:check']?.includes('bun run sanity:starter-quasar-compat'))
  problems.push('release:check must run the starter Quasar compatibility guard')
if (packageJson.scripts?.['sanity:starter-release-runtime'] !== 'node scripts/check-starter-release-runtime.mjs')
  problems.push('starter production runtime guard is missing')
if (packageJson.scripts?.['sanity:release-lint-regressions'] !== 'node scripts/check-release-lint-regressions.mjs')
  problems.push('release lint regression guard is missing')
if (packageJson.scripts?.['sanity:release-typecheck-regressions'] !== 'node scripts/check-release-typecheck-regressions.mjs')
  problems.push('release TypeScript regression guard is missing')
if (windowsInstaller.includes("require.resolve('human-signals/package.json')"))
  problems.push('Windows installer must not probe non-exported package.json subpaths')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Full release gate regression guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Full release gate regressions are covered.')
