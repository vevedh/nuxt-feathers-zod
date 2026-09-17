import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { resolveNpmCliPath } from './lib/npm-cli.mjs'
import { createBunInstallArguments, selectSmokePackageManager } from './smoke-tarball-install.mjs'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const scripts = pkg.scripts || {}
const buildCli = readFileSync(resolve(rootDir, 'scripts/build-cli.mjs'), 'utf8')
const cleanup = readFileSync(resolve(rootDir, 'scripts/cleanup-safe.mjs'), 'utf8')
const playground = readFileSync(resolve(rootDir, 'playground/nuxt.config.ts'), 'utf8')
const verifyWindows = readFileSync(resolve(rootDir, 'scripts/verify-windows.ps1'), 'utf8')
const runPlayground = readFileSync(resolve(rootDir, 'scripts/run-playground.mjs'), 'utf8')
const packRelease = readFileSync(resolve(rootDir, 'scripts/pack-release.mjs'), 'utf8')
const npmCliResolver = readFileSync(resolve(rootDir, 'scripts/lib/npm-cli.mjs'), 'utf8')
const playwrightRunner = readFileSync(resolve(rootDir, 'scripts/run-playwright-tests.mjs'), 'utf8')
const playwrightRuntime = readFileSync(resolve(rootDir, 'scripts/lib/ensure-playwright-runtime.mjs'), 'utf8')
const bunExecutableResolver = readFileSync(resolve(rootDir, 'scripts/lib/bun-executable.mjs'), 'utf8')
const windowsInstaller = readFileSync(resolve(rootDir, 'scripts/install-windows.mjs'), 'utf8')
const windowsInstallPolicy = readFileSync(resolve(rootDir, 'scripts/lib/windows-install-policy.mjs'), 'utf8')
const windowsInstallVerification = readFileSync(resolve(rootDir, 'scripts/lib/windows-install-verification.mjs'), 'utf8')
const docsBuildRunner = readFileSync(resolve(rootDir, 'scripts/run-docs-build.mjs'), 'utf8')
const starterRelease = readFileSync(resolve(rootDir, 'scripts/validate-starter-release.mjs'), 'utf8')
const starterReleaseMongo = readFileSync(resolve(rootDir, 'scripts/lib/starter-release-mongodb.mjs'), 'utf8')
const starterReleaseInstaller = readFileSync(resolve(rootDir, 'scripts/lib/starter-release-installer.mjs'), 'utf8')
const starterReleaseInstallGuard = readFileSync(resolve(rootDir, 'scripts/check-starter-release-install-resilience.mjs'), 'utf8')
const tarballSmoke = readFileSync(resolve(rootDir, 'scripts/smoke-tarball-install.mjs'), 'utf8')
const publicationPipeline = readFileSync(resolve(rootDir, 'scripts/check-publication-pipeline.mjs'), 'utf8')
const publicDocCommandTest = readFileSync(resolve(rootDir, 'test/public-doc-commands.spec.ts'), 'utf8')
const embeddedAuthE2e = readFileSync(resolve(rootDir, 'test/e2e/embedded-auth.spec.ts'), 'utf8')
const embeddedBasicE2e = readFileSync(resolve(rootDir, 'test/e2e/embedded-basic.spec.ts'), 'utf8')
const embeddedAuthFixtureConfig = readFileSync(resolve(rootDir, 'test/fixtures/embedded-auth/nuxt.config.ts'), 'utf8')
const embeddedBasicFixtureConfig = readFileSync(resolve(rootDir, 'test/fixtures/embedded-basic/nuxt.config.ts'), 'utf8')
const ciWorkflow = readFileSync(resolve(rootDir, '.github/workflows/ci.yml'), 'utf8')

const failures = []

if (scripts['cli:build'] !== 'bun scripts/build-cli.mjs')
  failures.push('cli:build must run scripts/build-cli.mjs with Bun')

if (!buildCli.includes('globalThis.Bun') || !buildCli.includes('bunRuntime.build({'))
  failures.push('scripts/build-cli.mjs must use the Bun.build() API')

if (/spawn(?:Sync)?\s*\(/.test(buildCli) || buildCli.includes("from 'node:child_process'"))
  failures.push('scripts/build-cli.mjs must not spawn a PATH-dependent Bun child process')

for (const target of [
  "'.output'",
  "'node_modules/.vite'",
  "'playground/.output'",
  "'playground/node_modules/.vite'",
]) {
  if (!cleanup.includes(target))
    failures.push(`cleanup-safe.mjs is missing ${target}`)
}

if (!/optimizeDeps:\s*\{[\s\S]*include:\s*\['socket\.io-client'\]/.test(playground))
  failures.push('playground must pre-bundle socket.io-client')


if (scripts.dev !== 'node scripts/run-playground.mjs dev')
  failures.push('dev must run the project-local Nuxt CLI through Node.js')

if (scripts['playground:dev'] !== 'node scripts/run-playground.mjs dev')
  failures.push('playground:dev must use scripts/run-playground.mjs')

if (scripts['playground:build'] !== 'node scripts/run-playground.mjs build')
  failures.push('playground:build must use scripts/run-playground.mjs')

if (
  !runPlayground.includes("await import('@nuxt/cli/cli')")
  || !runPlayground.includes("await import('./ensure-playground-self-link.mjs')")
) {
  failures.push('run-playground.mjs must load the local Nuxt CLI and ensure the playground link')
}

if (/spawn(?:Sync)?\s*\(/.test(runPlayground) || runPlayground.includes("node:child_process"))
  failures.push('run-playground.mjs must not spawn a child process')

if (
  !runPlayground.includes('await writeTypes(nuxt)')
  || runPlayground.indexOf('await writeTypes(nuxt)') > runPlayground.indexOf('await buildNuxt(nuxt)')
) {
  failures.push('run-playground.mjs must generate the playground tsconfig before buildNuxt')
}


if (!packRelease.includes('resolveNpmCliPath()') || !packRelease.includes('process.execPath'))
  failures.push('release:pack must invoke the resolved npm CLI through Node.js before falling back to a shell shim')

if (!npmCliResolver.includes('npm-cli\.js') || !npmCliResolver.includes("../lib/node_modules/npm/bin/npm-cli.js"))
  failures.push('npm CLI resolution must support standard Windows and Unix Node.js layouts')

const npmCliFixtureRoot = mkdtempSync(join(tmpdir(), 'nfz-npm-cli-'))
try {
  const executableDirectory = resolve(npmCliFixtureRoot, 'node')
  const fakeNpmCli = resolve(executableDirectory, 'node_modules/npm/bin/npm-cli.js')
  mkdirSync(resolve(fakeNpmCli, '..'), { recursive: true })
  writeFileSync(fakeNpmCli, '# test fixture\n', 'utf8')
  const resolvedFakeCli = resolveNpmCliPath({
    execPath: resolve(executableDirectory, 'node.exe'),
    env: {},
  })
  if (resolvedFakeCli !== fakeNpmCli)
    failures.push('npm CLI resolver must find the npm JavaScript entrypoint beside a Windows node.exe layout')
}
finally {
  rmSync(npmCliFixtureRoot, { recursive: true, force: true })
}

if (
  !playwrightRunner.includes("require.resolve('@playwright/test/package.json')")
  || !playwrightRunner.includes('packageJson.bin')
  || !playwrightRunner.includes('process.execPath')
  || !playwrightRunner.includes('ensurePlaywrightRuntime(rootDir)')
) {
  failures.push('Playwright tests must prepare dist, resolve the package bin and run it through Node.js')
}

if (
  !playwrightRuntime.includes('requireBunExecutable()')
  || !playwrightRuntime.includes("runBunScript('module:prepare', rootDir)")
  || !playwrightRuntime.includes("runBunScript('module:build', rootDir)")
) {
  failures.push('Playwright runtime preparation must rebuild missing dist files with the Bun executable on Windows')
}




for (const installerFragment of [
  "process.env.LOCALAPPDATA",
  "'--ignore-scripts'",
  "'--no-cache'",
  'isolated no-manifest-cache rescue attempt',
]) {
  if (!windowsInstaller.includes(installerFragment))
    failures.push(`Windows installer is missing ${installerFragment}`)
}

if (!ciWorkflow.includes('windows-release-smoke:') || !ciWorkflow.includes('runs-on: windows-latest'))
  failures.push('CI must include a dedicated windows-latest release smoke job')

for (const requiredWindowsCiFragment of [
  'bun-version: 1.3.14',
  'bun run install:windows',
  'bun run sanity:windows-tooling',
  'bun run sanity:windows-install-retry',
  'bun run sanity:windows-install-verification',
  'bun run sanity:starter-release-install-resilience',
  'bun run sanity:dependency-convergence',
  'bun run sanity:file-service-template',
  'bun run typecheck',
  'bun run build',
  'test/unit/server-bootstrap.test.ts',
  'bun run cli:smoke',
  'bun run release:candidate',
  'bun run smoke:tarball',
]) {
  if (!ciWorkflow.includes(requiredWindowsCiFragment))
    failures.push(`Windows CI release smoke is missing ${requiredWindowsCiFragment}`)
}


if (scripts['sanity:windows-install-resilience'] !== 'node scripts/check-windows-install-resilience.mjs')
  failures.push('sanity:windows-install-resilience must guard lifecycle suppression and isolated rescue behavior')

if (scripts['sanity:docs-build-resilience'] !== 'node scripts/check-docs-build-resilience.mjs')
  failures.push('sanity:docs-build-resilience must guard documentation install retries and isolated rescue behavior')

if (scripts['sanity:starter-release-install-resilience'] !== 'node scripts/check-starter-release-install-resilience.mjs')
  failures.push('sanity:starter-release-install-resilience must guard starter tarball install retries and isolated rescue behavior')

if (scripts['sanity:mcp-maintainer-config'] !== 'node scripts/check-mcp-maintainer-config.mjs')
  failures.push('sanity:mcp-maintainer-config must validate the private documentation MCP configuration')

if (scripts['sanity:publication-pipeline'] !== 'node scripts/check-publication-pipeline.mjs')
  failures.push('sanity:publication-pipeline must guard the immutable single-artifact publication workflow')
if (!publicationPipeline.includes('single-artifact, immutable and publish-ready'))
  failures.push('publication pipeline guard must report the immutable single-artifact contract')

if (scripts['smoke:tarball'] !== 'node scripts/smoke-tarball-install.mjs')
  failures.push('smoke:tarball must use the cross-platform tarball consumer runner')

const windowsSmokeManager = selectSmokePackageManager({
  platform: 'win32',
  forced: undefined,
  runningWithBun: true,
  bunAvailable: true,
  npmAvailable: true,
})
if (windowsSmokeManager !== 'npm')
  failures.push('Windows tarball smoke must prefer npm unless NFZ_SMOKE_PM explicitly forces Bun')

const forcedWindowsBun = selectSmokePackageManager({
  platform: 'win32',
  forced: 'bun',
  runningWithBun: true,
  bunAvailable: true,
  npmAvailable: true,
})
if (forcedWindowsBun !== 'bun')
  failures.push('NFZ_SMOKE_PM=bun must keep the explicit Bun tarball-smoke path')

const bunSmokeArgs = createBunInstallArguments(resolve(rootDir, '.tmp-smoke-cache'))
for (const requiredArgument of [
  '--backend=copyfile',
  '--linker=hoisted',
  '--concurrent-scripts=1',
  '--cache-dir',
]) {
  if (!bunSmokeArgs.includes(requiredArgument))
    failures.push(`forced Bun tarball smoke is missing ${requiredArgument}`)
}

if (
  !tarballSmoke.includes('Windows consumer install uses npm by default')
  || !tarballSmoke.includes('BUN_INSTALL_CACHE_DIR')
  || !tarballSmoke.includes("'--backend=copyfile'")
) {
  failures.push('tarball smoke must document the Windows npm default and isolate forced Bun installs')
}

if (
  !tarballSmoke.includes("const starterTarget = 'generated-starter'")
  || !tarballSmoke.includes("'quasar-unocss-pinia-auth'")
  || !tarballSmoke.includes("'app/app.vue'")
) {
  failures.push('tarball smoke must execute the installed CLI starter generator and verify copied files')
}


if (publicDocCommandTest.includes("execFileSync('bun'"))
  failures.push('public documentation command tests must not spawn Bun through a PATH-dependent binary name')

if (publicDocCommandTest.includes("resolve(root, 'src/cli/bin.ts')"))
  failures.push('public documentation command tests must not execute the TypeScript source CLI through Node.js')

if (!publicDocCommandTest.includes("execFileSync(process.execPath, [resolve(root, 'bin/nuxt-feathers-zod')"))
  failures.push('public documentation help commands must execute the packaged CLI bin through process.execPath')

for (const [name, source] of [
  ['embedded-auth', embeddedAuthE2e],
  ['embedded-basic', embeddedBasicE2e],
]) {
  if (!source.includes("process.platform === 'win32' ? 420_000 : 120_000"))
    failures.push(`${name} E2E must use the bounded 420s Windows setup timeout instead of @nuxt/test-utils defaults`)
  if (!source.includes("process.platform === 'win32' ? 180_000 : 60_000"))
    failures.push(`${name} E2E must use the bounded 180s Windows server-start timeout`)
  if (!source.includes('setupTimeout: e2eSetupTimeout') || !source.includes('serverStartTimeout: e2eServerStartTimeout'))
    failures.push(`${name} E2E must pass explicit setup/server-start timeouts to Nuxt test-utils`)
}


for (const [name, source] of [
  ['embedded-auth', embeddedAuthFixtureConfig],
  ['embedded-basic', embeddedBasicFixtureConfig],
]) {
  if (!source.includes("../../../dist/module.mjs"))
    failures.push(`${name} E2E fixture must load the already-built dist/module.mjs artifact`)
  if (source.includes("../../../src/module.ts"))
    failures.push(`${name} E2E fixture must not compile src/module.ts inside @nuxt/test-utils setup`)
}

if (!playwrightRuntime.includes("resolve(rootDir, 'dist/module.mjs')"))
  failures.push('E2E runtime preparation must guarantee dist/module.mjs before fixture startup')

if (scripts['test:playwright'] !== 'node scripts/run-playwright-tests.mjs')
  failures.push('test:playwright must use the cross-platform Playwright runner')

if (scripts['playwright:install:ci'] !== 'node scripts/run-playwright-tests.mjs --install-browser --with-deps')
  failures.push('playwright:install:ci must install Chromium system dependencies through the local CLI')

if (scripts['sanity:playwright'] !== 'node scripts/check-playwright-foundation.mjs')
  failures.push('sanity:playwright must guard the browser validation and documentation contract')

if (scripts['repo:clean-maintenance-index:if-git'] !== 'node scripts/clean-tracked-maintenance.mjs --if-git')
  failures.push('best-effort maintenance-index cleanup must be available for extracted workspaces')

if (!String(scripts['clean:repo'] || '').includes('clean-tracked-maintenance.mjs --if-git'))
  failures.push('clean:repo must remove stale tracked maintenance artifacts from the Git index')

if (!String(scripts['prepare:project'] || '').startsWith('bun run repo:clean-maintenance-index:if-git && '))
  failures.push('prepare:project must migrate stale maintenance paths before enforcing repository hygiene')

if (pkg.engines?.bun !== '>=1.3.6')
  failures.push('engines.bun must require Bun >=1.3.6')

if (pkg.packageManager !== 'bun@1.3.14')
  failures.push('packageManager must pin the Windows-revalidated Bun 1.3.14 release')

if (scripts['install:windows'] !== 'node scripts/install-windows.mjs')
  failures.push('install:windows must execute the resilient reusable-cache installer')

for (const fragment of [
  "'--backend=copyfile'",
  "'--linker=hoisted'",
  "'--concurrent-scripts=1'",
  '`--network-concurrency=${networkConcurrency}`',
  "'--cache-dir'",
  "resolve(stateRoot, 'shared-cache')",
  'NFZ_WINDOWS_CACHE_DIR',
  'install-state.json',
  'shouldReuseInstall({ force, stateMatches, installVerified })',
  'removeTransientCacheEntries()',
  'verifyInstall()',
  "process.argv.includes('--check')",
]) {
  if (!windowsInstaller.includes(fragment))
    failures.push(`install-windows.mjs is missing ${fragment}`)
}

if (windowsInstaller.includes('resolve(cacheRoot, `attempt-${attempt}`)'))
  failures.push('install-windows.mjs must not create a fresh empty cache for every retry')

if (!windowsInstaller.includes('verifyWindowsInstall({ root })'))
  failures.push('install-windows.mjs must verify public runtime entry points after Bun exits successfully')

if (windowsInstaller.includes("require.resolve('human-signals/package.json')"))
  failures.push('install-windows.mjs must not resolve package.json subpaths that ESM packages may not export')

if (!windowsInstallVerification.includes('await import(specifier)'))
  failures.push('windows-install-verification.mjs must execute public package entry-point probes')

for (const fragment of [
  'resolveNetworkConcurrency',
  'isWindowsFileLockFailure',
  'isRetryableInstallFailure',
  'shouldReuseInstall',
]) {
  if (!windowsInstallPolicy.includes(fragment))
    failures.push(`windows-install-policy.mjs is missing ${fragment}`)
}

if (!bunExecutableResolver.includes('NFZ_BUN_EXECUTABLE') || !bunExecutableResolver.includes('npm_execpath'))
  failures.push('Bun executable resolution must support bun-run shims and an explicit absolute override')

if (!starterRelease.includes('requireBunExecutable()') || !starterRelease.includes('installStarterReleaseDependencies'))
  failures.push('starter release validation must resolve Bun robustly and use the resilient starter installer')
if (!starterRelease.includes('resolveReleaseArtifact(root)') || !starterRelease.includes("recordArtifactValidation(root, 'starter'"))
  failures.push('starter release validation must consume and stamp the exact existing candidate')
if (!starterRelease.includes('provisionStarterReleaseMongo()') || !starterRelease.includes('await mongoRuntime?.stop()'))
  failures.push('starter release validation must provision and stop its MongoDB runtime autonomously')
if (!starterReleaseMongo.includes("await import('mongodb-memory-server')") || !starterReleaseMongo.includes("new Set(['auto', 'external', 'memory'])"))
  failures.push('starter release MongoDB provisioning must support isolated fallback and explicit modes')
if (!starterReleaseMongo.includes('MONGODB_URL is ignored in auto mode') || starterReleaseMongo.includes("resolvedMode === 'auto' && normalizedUrl"))
  failures.push('starter release MongoDB auto mode must remain isolated from ambient MONGODB_URL values')
if (!starterReleaseMongo.includes('await collection.createIndex({ nfzProbe: 1 })'))
  failures.push('explicit external starter MongoDB validation must verify write/index permissions before the candidate lifecycle')
if (!tarballSmoke.includes('resolveReleaseArtifact(rootDir)') || !tarballSmoke.includes("recordArtifactValidation(rootDir, 'consumer'"))
  failures.push('tarball smoke must consume and stamp the exact existing candidate')

for (const fragment of [
  'process.env.LOCALAPPDATA',
  'NFZ_STARTER_RELEASE_CACHE_DIR',
  "'--backend=copyfile'",
  "'--ignore-scripts'",
  "'--no-cache'",
  'resolveNetworkConcurrency',
  'verifyStarterInstall',
]) {
  if (!starterReleaseInstaller.includes(fragment))
    failures.push(`starter release installer is missing ${fragment}`)
}

for (const fragment of [
  'sharedAttempts=3',
  'isolatedRescue=1',
  'frozenVerification=true',
  "'--frozen-lockfile'",
  "'--no-cache'",
]) {
  if (!starterReleaseInstallGuard.includes(fragment))
    failures.push(`starter release install resilience guard is missing ${fragment}`)
}

for (const fragment of [
  'BUN_INSTALL_CACHE_DIR',
  'process.env.LOCALAPPDATA',
  'NFZ_DOCS_CACHE_DIR',
  "'--backend=copyfile'",
  "'--ignore-scripts'",
  "'--no-cache'",
  'verifyVitePressInstall',
]) {
  if (!docsBuildRunner.includes(fragment))
    failures.push(`documentation build runner is missing ${fragment}`)
}

if (scripts['verify:windows'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -Quick')
  failures.push('verify:windows must execute the explicit quick Windows gate')

if (scripts['verify:windows:skip-install'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -Quick -SkipInstall')
  failures.push('verify:windows:skip-install must reuse a verified dependency tree')

if (!verifyWindows.includes("[version]'1.3.6'") || !verifyWindows.includes("bun upgrade"))
  failures.push('verify-windows.ps1 must reject Bun versions older than 1.3.6 with an upgrade hint')

if (!verifyWindows.includes('node scripts/print-bun-executable.mjs'))
  failures.push('verify-windows.ps1 must resolve Bun through the shared executable resolver')

if (!verifyWindows.includes('node scripts/install-windows.mjs --check') || !verifyWindows.includes('$SkipInstall'))
  failures.push('verify-windows.ps1 must support validated skip-install mode')

if (!verifyWindows.includes("sanity:docs-build-resilience"))
  failures.push('verify-windows.ps1 must run the documentation build resilience guard before VitePress builds')

if (!verifyWindows.includes("sanity:release-docker") || !verifyWindows.includes('$ResumeCandidate'))
  failures.push('verify-windows.ps1 must preflight Docker for full/resume modes and support candidate resume')

if (verifyWindows.includes('[int]$Full') || verifyWindows.includes('[int]$Quick') || verifyWindows.includes('[int]$ResumeCandidate'))
  failures.push('verify-windows.ps1 must not cast SwitchParameter values directly to Int32; use IsPresent-based mode counting')

for (const fragment of ['$ModeSwitch.IsPresent', '$ModeSwitchCount++', 'if ($ModeSwitchCount -gt 1)']) {
  if (!verifyWindows.includes(fragment))
    failures.push(`verify-windows.ps1 mode exclusivity guard is missing ${fragment}`)
}

if (!verifyWindows.includes('scripts/check-release-candidate-state.mjs --has-validation'))
  failures.push('verify-windows.ps1 candidate resume must validate stamps against the exact candidate SHA')

if (!verifyWindows.includes("sanity:starter-release-install-resilience"))
  failures.push('verify-windows.ps1 must run the starter release install resilience guard before the expensive release gates')

if (!verifyWindows.includes("sanity:starter-release-runtime"))
  failures.push('verify-windows.ps1 must validate the starter production auth and health harness before the installed gates')

if (!verifyWindows.includes("sanity:generated-template-types"))
  failures.push('verify-windows.ps1 must validate generated server handler syntax before the installed gates')

for (const command of ['clean:repo', 'lint', 'typecheck', 'test', 'build']) {
  if (!verifyWindows.includes(`'${command}'`))
    failures.push(`verify-windows.ps1 is missing the ${command} step`)
}

for (const command of [
  'docs:build',
  'docs:private:build',
  'test:playwright',
  'release:candidate',
  'test:postgresql:release',
  'test:mysql-mariadb:release',
  'test:sqlite:release',
  'test:mssql:release',
  'test:database-matrix:release',
  'test:starter:release',
  'smoke:tarball',
  'release:finalize',
]) {
  if (!verifyWindows.includes(`'${command}'`))
    failures.push(`verify-windows.ps1 full mode is missing the ${command} step`)
}

const dockerPreflightIndex = verifyWindows.indexOf("'sanity:release-docker'")
const cleanRepoIndex = verifyWindows.indexOf("'clean:repo'")
if (dockerPreflightIndex < 0 || cleanRepoIndex < 0 || dockerPreflightIndex > cleanRepoIndex)
  failures.push('full release Docker preflight must run before clean/source/docs/browser gates')

const candidateIndex = verifyWindows.lastIndexOf("'release:candidate'")
const postgresqlIndex = verifyWindows.lastIndexOf("'test:postgresql:release'")
const mysqlMariaDbIndex = verifyWindows.lastIndexOf("'test:mysql-mariadb:release'")
const sqliteIndex = verifyWindows.lastIndexOf("'test:sqlite:release'")
const mssqlIndex = verifyWindows.lastIndexOf("'test:mssql:release'")
const databaseMatrixIndex = verifyWindows.lastIndexOf("'test:database-matrix:release'")
const starterIndex = verifyWindows.lastIndexOf("'test:starter:release'")
const smokeIndex = verifyWindows.lastIndexOf("'smoke:tarball'")
const finalizerIndex = verifyWindows.lastIndexOf("'release:finalize'")
if (!(candidateIndex >= 0 && postgresqlIndex > candidateIndex && mysqlMariaDbIndex > postgresqlIndex
  && sqliteIndex > mysqlMariaDbIndex && mssqlIndex > sqliteIndex
  && databaseMatrixIndex > mssqlIndex && starterIndex > databaseMatrixIndex
  && smokeIndex > starterIndex && finalizerIndex > smokeIndex)) {
  failures.push('verify-windows.ps1 must validate PostgreSQL, MySQL/MariaDB, SQLite, MSSQL, database matrix, starter and consumer against one candidate before finalization')
}
if (verifyWindows.slice(finalizerIndex + 1).includes('Invoke-BunCommand'))
  failures.push('verify-windows.ps1 must not execute another Bun command after release finalization')

if (scripts['verify:release:windows'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -Full')
  failures.push('verify:release:windows must execute the complete fail-fast Windows release gate')

if (scripts['verify:release:windows:skip-install'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -Full -SkipInstall')
  failures.push('verify:release:windows:skip-install must execute the complete gate without reinstalling')

if (scripts['verify:release:windows:resume'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1 -ResumeCandidate')
  failures.push('verify:release:windows:resume must resume the immutable candidate without replaying source gates')

if (scripts['sanity:release-docker'] !== 'node scripts/check-release-docker-preflight.mjs')
  failures.push('sanity:release-docker must guard Docker Engine availability before expensive release work')

if (scripts['sanity:windows-install-retry'] !== 'node scripts/check-windows-install-retry-policy.mjs')
  failures.push('sanity:windows-install-retry must guard the adaptive reusable-cache policy')

if (scripts['sanity:windows-install-verification'] !== 'node scripts/check-windows-install-verification.mjs')
  failures.push('sanity:windows-install-verification must guard post-install runtime probes')

if (scripts['sanity:powershell-interpolation'] !== 'node scripts/check-powershell-interpolation.mjs')
  failures.push('sanity:powershell-interpolation must guard ambiguous variable-colon interpolation')

if (/\$LASTEXITCODE:/.test(verifyWindows))
  failures.push('verify-windows.ps1 must not interpolate $LASTEXITCODE immediately before a colon')

if (!verifyWindows.includes("'Bun command failed with exit code {0}: {1} {2}' -f"))
  failures.push('verify-windows.ps1 must format Bun failures without ambiguous PowerShell interpolation')

const fresh = String(scripts['dev:fresh'] || '')
const expectedOrder = [
  'bun install --frozen-lockfile',
  'bun run clean:repo',
  'bun run typecheck',
  'node scripts/run-playground.mjs dev',
]
let previousIndex = -1
for (const command of expectedOrder) {
  const index = fresh.indexOf(command)
  if (index <= previousIndex) {
    failures.push(`dev:fresh must contain commands in order; missing or misplaced: ${command}`)
    break
  }
  previousIndex = index
}

if (failures.length) {
  console.error('[nuxt-feathers-zod] Windows tooling guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Windows tooling guard passed.')
