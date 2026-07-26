import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, resolve } from 'node:path'

const root = resolve(process.cwd())
const runnerPath = resolve(root, 'scripts/run-docs-build.mjs')
const runner = readFileSync(runnerPath, 'utf8')
const failures = []
const fixtureRoots = []

for (const fragment of [
  'process.env.LOCALAPPDATA',
  'NFZ_DOCS_CACHE_DIR',
  "'--ignore-scripts'",
  "'--no-cache'",
  'isolated no-cache rescue attempt',
  'verifyVitePressInstall',
  'resolveLockedVitePressVersion',
  "verification: 'static-lockfile'",
  'docs-install-state',
  'NFZ_BUN_EXECUTABLE_ARGS',
  '--bun-executable',
  '--bun-executable-args-json',
  '--bun-version',
  '--retry-delay-ms',
  'suppliedRetryDelayMs',
  'formatBunInvocation',
  'NFZ_DOCS_PROBE_TIMEOUT_MS',
  'NFZ_DOCS_BUILD_TIMEOUT_MS',
  'NFZ_DOCS_HEARTBEAT_MS',
  'NFZ_DOCS_TERMINATION_GRACE_MS',
  'forcedCompletion',
  'process.execPath',
  'terminateProcessTree',
  'VitePress build completed',
]) {
  if (!runner.includes(fragment))
    failures.push(`documentation build runner is missing ${fragment}`)
}

if (runner.includes("[cliPath, '--version']"))
  failures.push('documentation install verification must not execute the VitePress CLI --version probe')

const docsLockPath = resolve(root, 'docs', 'bun.lock')
const docsLock = readFileSync(docsLockPath, 'utf8')
if (!docsLock.trimStart().startsWith('{') || !docsLock.includes('"lockfileVersion": 1'))
  failures.push('documentation resilience fixture source must be a real Bun text lockfile')

function readEvents(path) {
  if (!existsSync(path))
    return []
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line))
}

function createFixture(label) {
  const fixture = mkdtempSync(resolve(tmpdir(), `nfz-docs-resilience-${label}-`))
  fixtureRoots.push(fixture)

  const fixtureScripts = resolve(fixture, 'scripts')
  const fixtureLib = resolve(fixtureScripts, 'lib')
  const fixtureDocs = resolve(fixture, 'docs')
  mkdirSync(fixtureLib, { recursive: true })
  mkdirSync(fixtureDocs, { recursive: true })

  cpSync(runnerPath, resolve(fixtureScripts, 'run-docs-build.mjs'))
  cpSync(resolve(root, 'scripts/lib/bun-executable.mjs'), resolve(fixtureLib, 'bun-executable.mjs'))
  cpSync(resolve(root, 'scripts/lib/windows-install-policy.mjs'), resolve(fixtureLib, 'windows-install-policy.mjs'))
  cpSync(resolve(root, 'docs', 'package.json'), resolve(fixtureDocs, 'package.json'))
  cpSync(resolve(root, 'docs', 'bun.lock'), resolve(fixtureDocs, 'bun.lock'))

  const fakeBunJs = resolve(fixture, 'fake-bun.mjs')
  const installEventsFile = resolve(fixture, 'install-events.ndjson')
  const vitePressProbeCounter = resolve(fixture, 'vitepress-probe-count.txt')
  const bunVersionProbeCounter = resolve(fixture, 'bun-version-probe-count.txt')
  const fakeVitePressSource = [
    '#!/usr/bin/env node',
    "import { writeFileSync } from 'node:fs'",
    'if (process.argv.includes(\'--version\')) {',
    `  writeFileSync(${JSON.stringify(vitePressProbeCounter)}, '1', 'utf8')`,
    '  console.error(\'VitePress runtime probe must not run during install verification\')',
    '  process.exit(91)',
    '}',
    'if (process.argv[2] === \'build\') {',
    '  if (process.env.NFZ_FAKE_VITEPRESS_HANG === \'1\')',
    '    setInterval(() => {}, 1000)',
    '  else',
    '    console.log(\'fake VitePress build complete\')',
    '}',
    '',
  ].join('\n')
  const fakeSource = `#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const args = process.argv.slice(2)
const installEventsFile = ${JSON.stringify(installEventsFile)}
if (args[0] === '--version') {
  writeFileSync(${JSON.stringify(bunVersionProbeCounter)}, '1', 'utf8')
  console.error('Fake Bun version probe must not run when --bun-version is supplied')
  process.exit(92)
}
if (args[0] === 'install') {
  appendFileSync(installEventsFile, JSON.stringify({ pid: process.pid, args }) + '\\n', 'utf8')
  const count = readFileSync(installEventsFile, 'utf8').split(/\\r?\\n/).filter(Boolean).length
  const failInstalls = Number.parseInt(process.env.NFZ_FAKE_BUN_FAIL_INSTALLS || '0', 10)
  if (count <= failInstalls) {
    console.error('EPERM: Operation not permitted (NtSetInformationFile())')
    process.exit(1)
  }
  const packageRoot = resolve(process.cwd(), 'node_modules', 'vitepress')
  mkdirSync(resolve(packageRoot, 'bin'), { recursive: true })
  writeFileSync(
    resolve(packageRoot, 'package.json'),
    JSON.stringify({ name: 'vitepress', version: '1.6.4', bin: { vitepress: 'bin/vitepress.js' } }),
    'utf8',
  )
  writeFileSync(
    resolve(packageRoot, 'bin', 'vitepress.js'),
    ${JSON.stringify(fakeVitePressSource)},
    'utf8',
  )
  process.exit(0)
}
console.error('Unexpected fake Bun invocation:', args.join(' '))
process.exit(1)
`
  writeFileSync(fakeBunJs, fakeSource, 'utf8')

  const env = {
    ...process.env,
    NFZ_DOCS_INSTALL_ATTEMPTS: '3',
    NFZ_DOCS_CACHE_DIR: resolve(fixture, 'shared-cache'),
    NFZ_DOCS_PROBE_TIMEOUT_MS: '5000',
    NFZ_DOCS_TERMINATION_GRACE_MS: '400',
    NFZ_DOCS_BUILD_TIMEOUT_MS: '2000',
    NFZ_DOCS_HEARTBEAT_MS: '250',
  }
  const runnerInvocation = [
    resolve(fixtureScripts, 'run-docs-build.mjs'),
    'docs',
    '--bun-executable', process.execPath,
    '--bun-executable-args-json', JSON.stringify([fakeBunJs]),
    '--bun-version', '1.3.14',
    '--retry-delay-ms', '1',
  ]

  return {
    fixture,
    fakeBunJs,
    installEventsFile,
    vitePressProbeCounter,
    bunVersionProbeCounter,
    env,
    runnerInvocation,
  }
}

function executeScenario(scenario, { env = {}, timeout = 60_000 } = {}) {
  return spawnSync(process.execPath, scenario.runnerInvocation, {
    cwd: scenario.fixture,
    encoding: 'utf8',
    env: { ...scenario.env, ...env },
    maxBuffer: 8 * 1024 * 1024,
    timeout,
  })
}

try {
  const rescue = createFixture('rescue')
  const first = executeScenario(rescue, {
    env: { NFZ_FAKE_BUN_FAIL_INSTALLS: '3' },
  })
  const firstOutput = `${first.stdout || ''}${first.stderr || ''}`
  if (first.error?.code === 'ETIMEDOUT')
    failures.push(`documentation isolated-rescue smoke exceeded its external timeout: ${firstOutput}`)
  else if (first.status !== 0)
    failures.push(`documentation isolated-rescue smoke failed: ${firstOutput}`)

  if (!firstOutput.includes(`${basename(rescue.fakeBunJs)} install --frozen-lockfile`))
    failures.push(`documentation fake Bun prefix was not preserved in the executed command: ${firstOutput}`)
  if (/node(?:\.exe)?\s+install\s+--frozen-lockfile/i.test(firstOutput))
    failures.push('documentation smoke invoked Node directly as Bun without the fake Bun script prefix')
  if (existsSync(rescue.bunVersionProbeCounter))
    failures.push('documentation smoke executed the fake Bun --version probe despite the explicit version override')
  if (!firstOutput.includes('Using supplied retry delay 1 ms'))
    failures.push('documentation smoke did not use the deterministic retry-delay override')
  if (!firstOutput.includes('Running one isolated no-cache rescue attempt'))
    failures.push('documentation smoke did not reach the isolated no-cache rescue attempt')
  if (!firstOutput.includes('Starting the docs VitePress build with Node.js'))
    failures.push('documentation build did not report the Node.js VitePress execution phase')
  if (!firstOutput.includes('VitePress build completed for docs'))
    failures.push('documentation build did not report successful process completion')

  const eventsAfterFirst = readEvents(rescue.installEventsFile)
  if (eventsAfterFirst.length !== 4)
    failures.push(`documentation isolated rescue should install four times, received ${eventsAfterFirst.length}`)
  if (eventsAfterFirst.length === 4 && !eventsAfterFirst[3].args.includes('--no-cache'))
    failures.push('documentation fourth install event was not the isolated --no-cache rescue')

  if (first.status === 0 && eventsAfterFirst.length === 4) {
    const second = executeScenario(rescue, {
      env: { NFZ_FAKE_BUN_FAIL_INSTALLS: '3' },
      timeout: 30_000,
    })
    const secondOutput = `${second.stdout || ''}${second.stderr || ''}`
    if (second.error?.code === 'ETIMEDOUT')
      failures.push(`documentation verified-tree reuse smoke exceeded its external timeout: ${secondOutput}`)
    else if (second.status !== 0)
      failures.push(`documentation verified-tree reuse smoke failed: ${secondOutput}`)

    const eventsAfterSecond = readEvents(rescue.installEventsFile)
    if (eventsAfterSecond.length !== eventsAfterFirst.length)
      failures.push('documentation verified-tree reuse unexpectedly reinstalled dependencies')
    if (!secondOutput.includes('Reusing verified docs dependencies'))
      failures.push('documentation verified-tree reuse did not report the reuse decision')
    if (existsSync(rescue.vitePressProbeCounter))
      failures.push('documentation install verification executed the VitePress CLI instead of using static lockfile verification')
  }

  const hang = createFixture('hang')
  const hangSetup = executeScenario(hang, {
    env: { NFZ_FAKE_BUN_FAIL_INSTALLS: '0' },
    timeout: 30_000,
  })
  const hangSetupOutput = `${hangSetup.stdout || ''}${hangSetup.stderr || ''}`
  const hangSetupEvents = readEvents(hang.installEventsFile)
  if (hangSetup.error?.code === 'ETIMEDOUT')
    failures.push(`documentation hung-build setup exceeded its external timeout: ${hangSetupOutput}`)
  else if (hangSetup.status !== 0)
    failures.push(`documentation hung-build setup failed: ${hangSetupOutput}`)
  if (hangSetupEvents.length !== 1)
    failures.push(`documentation hung-build setup should install once, received ${hangSetupEvents.length}`)

  if (hangSetup.status === 0 && hangSetupEvents.length === 1) {
    const hangStartedAt = Date.now()
    const hungBuild = executeScenario(hang, {
      env: {
        NFZ_FAKE_BUN_FAIL_INSTALLS: '0',
        NFZ_FAKE_VITEPRESS_HANG: '1',
        NFZ_DOCS_BUILD_TIMEOUT_MS: '600',
        NFZ_DOCS_HEARTBEAT_MS: '100',
        NFZ_DOCS_TERMINATION_GRACE_MS: '400',
      },
      timeout: 15_000,
    })
    const hangElapsedMs = Date.now() - hangStartedAt
    const hangOutput = `${hungBuild.stdout || ''}${hungBuild.stderr || ''}`
    if (hungBuild.error?.code === 'ETIMEDOUT')
      failures.push(`documentation hung-build smoke exceeded its external timeout: ${hangOutput}`)
    if (hungBuild.status === 0)
      failures.push('documentation hung-build smoke unexpectedly succeeded')
    if (!hangOutput.includes('VitePress build timed out for docs'))
      failures.push(`documentation hung-build smoke did not report a bounded timeout: ${hangOutput}`)
    if (hangElapsedMs >= 12_000)
      failures.push(`documentation hung-build smoke did not return promptly (${hangElapsedMs} ms)`)
    if (readEvents(hang.installEventsFile).length !== hangSetupEvents.length)
      failures.push('documentation hung-build scenario unexpectedly reinstalled dependencies')
  }
}
finally {
  for (const fixture of fixtureRoots)
    rmSync(fixture, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
}

if (failures.length) {
  console.error('[nuxt-feathers-zod] Documentation build resilience guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  '[nuxt-feathers-zod] Documentation dependency installation and process completion are aligned: '
  + 'sharedAttempts=3 isolatedRescue=1 verifiedReuse=true staticVerification=true '
  + 'boundedHang=true deterministicRetry=true isolatedScenarios=true.',
)
