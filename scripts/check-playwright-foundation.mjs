import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const read = path => readFileSync(resolve(rootDir, path), 'utf8')
const pkg = JSON.parse(read('package.json'))
const scripts = pkg.scripts || {}
const failures = []
const rootTsconfig = JSON.parse(read('tsconfig.json'))
const typecheckTsconfig = JSON.parse(read('tsconfig.typecheck.json'))

const requiredFiles = [
  'playwright.config.ts',
  'scripts/lib/ensure-playwright-runtime.mjs',
  'scripts/run-playwright-server.mjs',
  'scripts/run-playwright-tests.mjs',
  'test/playwright/playground-functional.spec.ts',
  'docs/guide/playground.md',
  'docs/en/guide/playground.md',
  'docs/public/images/guides/playwright/playwright-dashboard.png',
  'docs/public/images/guides/playwright/playwright-diagnostics.png',
]

for (const path of requiredFiles) {
  if (!existsSync(resolve(rootDir, path)))
    failures.push(`missing Playwright foundation file: ${path}`)
}

const expectedScripts = {
  'test:playwright': 'node scripts/run-playwright-tests.mjs',
  'playwright:install': 'node scripts/run-playwright-tests.mjs --install-browser',
  'playwright:install:ci': 'node scripts/run-playwright-tests.mjs --install-browser --with-deps',
  'docs:screenshots': 'node scripts/run-playwright-tests.mjs --update-doc-screenshots --grep @docs',
  'verify:browser': 'bun run test:playwright',
}

for (const [name, command] of Object.entries(expectedScripts)) {
  if (scripts[name] !== command)
    failures.push(`${name} must be "${command}"`)
}

if (!rootTsconfig.include?.includes('playwright.config.ts'))
  failures.push('tsconfig.json must include playwright.config.ts for typed ESLint project-service parsing')

for (const subpath of [
  'nuxt-feathers-zod/query',
  'nuxt-feathers-zod/server-auth',
  'nuxt-feathers-zod/validators',
]) {
  if (!typecheckTsconfig.compilerOptions?.paths?.[subpath])
    failures.push(`tsconfig.typecheck.json must resolve ${subpath} without requiring a pre-existing dist directory`)
}

const fullReleaseCheck = String(scripts['release:check:full'] || '')
if (!fullReleaseCheck.includes('bun run test:playwright'))
  failures.push('release:check:full must include Playwright before candidate packaging')
if (fullReleaseCheck.includes('bun run smoke:tarball'))
  failures.push('release:check:full must not create or validate tarballs before the single-candidate phase')

const artifactVerification = String(scripts['release:verify:artifact'] || '')
const postgresqlIndex = artifactVerification.indexOf('bun run test:postgresql:release')
const starterIndex = artifactVerification.indexOf('bun run test:starter:release')
const tarballIndex = artifactVerification.indexOf('bun run smoke:tarball')
if (postgresqlIndex === -1 || starterIndex === -1 || tarballIndex === -1
  || postgresqlIndex > starterIndex || starterIndex > tarballIndex) {
  failures.push('release:verify:artifact must validate PostgreSQL, then starter, then clean consumer')
}

if (existsSync(resolve(rootDir, 'scripts/run-playwright-tests.mjs'))) {
  const runner = read('scripts/run-playwright-tests.mjs')
  for (const contract of [
    "require.resolve('@playwright/test/package.json')",
    'packageJson.bin',
    'process.execPath',
    'ensurePlaywrightRuntime(rootDir)',
  ]) {
    if (!runner.includes(contract))
      failures.push(`Playwright runner is missing cross-platform CLI contract: ${contract}`)
  }
}

if (existsSync(resolve(rootDir, 'docs-private'))) {
  for (const path of [
    'docs-private/.vitepress/config.mts',
    'docs-private/workflow/playwright.md',
  ]) {
    if (!existsSync(resolve(rootDir, path)))
      failures.push(`private Playwright documentation is missing: ${path}`)
  }
}

if (existsSync(resolve(rootDir, 'scripts/lib/ensure-playwright-runtime.mjs'))) {
  const runtimePreparation = read('scripts/lib/ensure-playwright-runtime.mjs')
  for (const contract of [
    "resolve(rootDir, 'dist/module.mjs')",
    "resolve(rootDir, 'dist/runtime/server/instance-registry.js')",
    "resolve(rootDir, 'dist/runtime/server/console-services.js')",
    "runBunScript('module:prepare', rootDir)",
    "runBunScript('module:build', rootDir)",
  ]) {
    if (!runtimePreparation.includes(contract))
      failures.push(`Playwright runtime preparation is missing contract: ${contract}`)
  }
}

if (existsSync(resolve(rootDir, 'scripts/run-e2e-tests.mjs'))) {
  const e2eRunner = read('scripts/run-e2e-tests.mjs')
  const runtimeChecks = e2eRunner.match(/ensurePlaywrightRuntime\(root\)/g) || []
  if (runtimeChecks.length < 2)
    failures.push('Vitest E2E runner must prepare the built module runtime before the suite and before every isolated fixture')
}


if (existsSync(resolve(rootDir, 'playground/app/middleware/session.global.ts'))) {
  const sessionMiddleware = read('playground/app/middleware/session.global.ts')
  if (sessionMiddleware.includes('navigateTo('))
    failures.push('global session restoration must not redirect public playground diagnostics')
  if (!sessionMiddleware.includes('auth.reAuthenticate().catch'))
    failures.push('global session restoration must fail softly for anonymous playground visitors')
}

if (existsSync(resolve(rootDir, 'playground/nuxt.config.ts')) && existsSync(resolve(rootDir, 'scripts/run-playwright-server.mjs'))) {
  const playgroundConfig = read('playground/nuxt.config.ts')
  const playwrightServer = read('scripts/run-playwright-server.mjs')

  if (!playwrightServer.includes(`process.env.NFZ_PLAYGROUND_EMBEDDED_MONGODB = 'false'`))
    failures.push('Playwright server must explicitly disable embedded MongoDB for the default browser scenario')
  if (!playgroundConfig.includes('allowMissingDatabaseServices: !embeddedMongoEnabled'))
    failures.push('playground must skip unavailable persistent services only when embedded MongoDB is deliberately disabled')
  if (playgroundConfig.includes('allowMissingDatabaseServices: true'))
    failures.push('playground must remain fail-closed when embedded MongoDB is enabled')
}

if (existsSync(resolve(rootDir, 'playground/app/pages/index.vue'))) {
  const dashboard = read('playground/app/pages/index.vue')
  for (const message of [
    'Diagnostic serveur protégé',
    'Découverte des services protégée',
  ]) {
    if (!dashboard.includes(message))
      failures.push(`dashboard quick checks must classify expected anonymous access as a warning: ${message}`)
  }
}

if (existsSync(resolve(rootDir, 'playwright.config.ts'))) {
  const config = read('playwright.config.ts')
  for (const contract of [
    "testDir: './test/playwright'",
    "command: 'node scripts/run-playwright-server.mjs'",
    "name: 'chromium-desktop'",
    "name: 'chromium-mobile'",
    "trace: 'retain-on-failure'",
  ]) {
    if (!config.includes(contract))
      failures.push(`playwright.config.ts is missing contract: ${contract}`)
  }
}

if (existsSync(resolve(rootDir, 'test/playwright/playground-functional.spec.ts'))) {
  const spec = read('test/playwright/playground-functional.spec.ts')
  for (const contract of [
    "page.on('pageerror'",
    "getByRole('button', { name: 'Lancer les contrôles rapides' })",
    "data-status=\"error\"",
    '@docs',
    'Tests essentiels',
    'NFZ_UPDATE_DOC_SCREENSHOTS',
    "testInfo.project.name.includes('mobile')",
    'packageVersion',
    'getByText(`v${packageVersion}`',
  ]) {
    if (!spec.includes(contract))
      failures.push(`Playwright functional suite is missing contract: ${contract}`)
  }
  if (/getByText\(["'`]v\d+\.\d+\.\d+/.test(spec))
    failures.push('Playwright functional suite must derive the displayed release version from package.json')
}

if (existsSync(resolve(rootDir, 'AGENTS.md'))) {
  const agents = read('AGENTS.md')
  for (const contract of [
    '## Browser and E2E validation',
    'bun run test:playwright',
    'bun run docs:screenshots',
    'accessible selectors',
    'direct, natural wording',
  ]) {
    if (!agents.includes(contract))
      failures.push(`AGENTS.md is missing browser/documentation rule: ${contract}`)
  }
}

for (const workflowPath of [
  '.github/workflows/ci.yml',
  '.github/workflows/publish-npm.yml',
]) {
  if (!existsSync(resolve(rootDir, workflowPath))) {
    failures.push(`missing workflow: ${workflowPath}`)
    continue
  }

  const workflow = read(workflowPath)
  if (!workflow.includes('bun run playwright:install:ci'))
    failures.push(`${workflowPath} must install Chromium and Linux dependencies`)
  if (!workflow.includes('bun run test:playwright') && !workflow.includes('bun run release:check:full'))
    failures.push(`${workflowPath} must execute the browser release gate`)
}

if (failures.length) {
  console.error('[nuxt-feathers-zod] Playwright foundation guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Playwright tests, CI gate, documentation and screenshots are aligned.')
