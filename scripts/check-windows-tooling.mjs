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
const tarballSmoke = readFileSync(resolve(rootDir, 'scripts/smoke-tarball-install.mjs'), 'utf8')

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
  !playwrightRuntime.includes("process.platform === 'win32' ? 'bun.exe' : 'bun'")
  || !playwrightRuntime.includes("runBunScript('module:prepare', rootDir)")
  || !playwrightRuntime.includes("runBunScript('module:build', rootDir)")
) {
  failures.push('Playwright runtime preparation must rebuild missing dist files with the Bun executable on Windows')
}


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

if (scripts['verify:windows'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1')
  failures.push('verify:windows must execute scripts/verify-windows.ps1')

if (!verifyWindows.includes("[version]'1.3.6'") || !verifyWindows.includes("bun upgrade"))
  failures.push('verify-windows.ps1 must reject Bun versions older than 1.3.6 with an upgrade hint')

for (const command of ['install', 'clean:repo', 'typecheck', 'test', 'build']) {
  if (!verifyWindows.includes(`'${command}'`))
    failures.push(`verify-windows.ps1 is missing the ${command} step`)
}

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
