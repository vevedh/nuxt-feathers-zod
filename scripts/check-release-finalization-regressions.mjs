import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relativePath => readFileSync(resolve(root, relativePath), 'utf8').replace(/\r\n?/g, '\n')
const pkg = JSON.parse(read('package.json'))
const starterPackage = JSON.parse(read('examples/nfz-quasar-unocss-pinia-starter/package.json'))
const spaPackage = JSON.parse(read('examples/nuxt4-keycloak-ldap-spa-ref/package.json'))
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function forbidText(source, forbidden, label) {
  if (source.includes(forbidden))
    problems.push(`${label}: forbidden ${JSON.stringify(forbidden)}`)
}

const bootstrap = read('src/runtime/server/bootstrap.ts')
const databaseRegistry = read('src/runtime/server/database-registry.ts')
const syncReleaseMetadata = read('scripts/sync-release-metadata.mjs')
const starterReadme = read('examples/nfz-quasar-unocss-pinia-starter/README.md')
const spaContext = read('examples/nuxt4-keycloak-ldap-spa-ref/PROJECT_CONTEXT.md')
const verifyWindows = read('scripts/verify-windows.ps1')
const releaseEnvironmentExample = read('.env.release.example')

requireText(
  bootstrap,
  "if (phase === 'modules:post') {\n          await runNamedModules(",
  'modules:post curly block',
)
requireText(
  bootstrap,
  'app.configure((configuredApp: any) => runtime.expressErrorHandler?.(configuredApp))',
  'bound Express error handler adapter',
)
forbidText(
  bootstrap,
  'app.configure(runtime.expressErrorHandler)',
  'unbound Express error handler',
)

requireText(databaseRegistry, 'const connectedResult = result', 'connected database result capture')
requireText(databaseRegistry, 'await connectedResult.close()', 'bound database close adapter')
requireText(databaseRegistry, 'await connectedResult.healthCheck()', 'bound database health adapter')
forbidText(databaseRegistry, 'handle.close = result.close', 'unbound database close method')

forbidText(
  syncReleaseMetadata,
  'pattern: /\\d+\\.\\d+\\.\\d+(?:-[0-9a-z.-]+)?/gi',
  'broad example semver replacement',
)
requireText(
  syncReleaseMetadata,
  'const currentExampleVersionReplacements = [',
  'scoped example release replacements',
)

requireText(
  starterReadme,
  'mongodb://root:changeMe@127.0.0.1:27037/nfz_starter?authSource=admin',
  'starter MongoDB loopback URI',
)
forbidText(
  starterReadme,
  `mongodb://root:changeMe@${pkg.version}.1:27037`,
  'release version must not replace an IPv4 address',
)

const expectedNuxtVersion = spaPackage.dependencies?.nuxt
requireText(spaContext, `Nuxt ${expectedNuxtVersion}`, 'SPA documented Nuxt version')
forbidText(spaContext, `Nuxt ${pkg.version}`, 'NFZ version must not replace Nuxt version')

if (starterPackage.dependencies?.['nuxt-feathers-zod'] !== pkg.version) {
  problems.push('starter dependency: nuxt-feathers-zod must match package.json version')
}

requireText(
  verifyWindows,
  "Import-ReleaseEnvironmentFile -Path (Join-Path (Get-Location) '.env.release.local')",
  'Windows release env loader',
)
requireText(
  verifyWindows,
  "GetEnvironmentVariable($Name, 'Process')",
  'process environment precedence',
)
requireText(
  releaseEnvironmentExample,
  'MONGODB_URL=mongodb://user:secret@127.0.0.1:27017/nfz_release?authSource=admin',
  'release environment MongoDB example',
)

if (problems.length) {
  console.error('[nuxt-feathers-zod] Release finalization regression guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Release finalization regressions are covered.')
