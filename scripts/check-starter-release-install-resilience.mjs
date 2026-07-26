import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { installStarterReleaseDependencies } from './lib/starter-release-installer.mjs'

const root = mkdtempSync(join(tmpdir(), 'nfz-starter-install-resilience-'))
const starter = join(root, 'starter')
const sharedCache = join(root, 'shared-cache')
const eventsPath = join(root, 'install-events.ndjson')
const fakeBun = join(root, 'fake-bun.mjs')
const expectedVersion = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')).version

try {
  mkdirSync(starter, { recursive: true })
  writeFileSync(join(starter, 'package.json'), `${JSON.stringify({
    name: 'nfz-starter-install-fixture',
    private: true,
    dependencies: {
      nuxt: '4.4.2',
      'nuxt-feathers-zod': expectedVersion,
      'vue-tsc': '3.1.8',
    },
  }, null, 2)}\n`)

  writeFileSync(fakeBun, `
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
if (args[0] !== 'install')
  process.exit(90)
const eventsPath = ${JSON.stringify(eventsPath)}
appendFileSync(eventsPath, JSON.stringify({ args }) + '\\n')
const count = readFileSync(eventsPath, 'utf8').trim().split(/\\r?\\n/).filter(Boolean).length
if (count <= 3) {
  console.error('EPERM: Operation not permitted (NtSetInformationFile())')
  process.exit(1)
}
if (args.includes('--frozen-lockfile') && !existsSync(resolve(process.cwd(), 'bun.lock'))) {
  console.error('missing lockfile')
  process.exit(2)
}
for (const [name, version] of [
  ['nuxt', '4.4.2'],
  ['nuxt-feathers-zod', ${JSON.stringify(expectedVersion)}],
  ['vue-tsc', '3.1.8'],
]) {
  const target = resolve(process.cwd(), 'node_modules', ...name.split('/'))
  mkdirSync(target, { recursive: true })
  writeFileSync(resolve(target, 'package.json'), JSON.stringify({ name, version }))
}
if (!args.includes('--frozen-lockfile'))
  writeFileSync(resolve(process.cwd(), 'bun.lock'), '# deterministic starter fixture\\n')
`, 'utf8')

  const result = await installStarterReleaseDependencies({
    bun: process.execPath,
    bunArgsPrefix: [fakeBun],
    starterDir: starter,
    workDir: root,
    expectedNfzVersion: expectedVersion,
    configuredCache: sharedCache,
    attempts: 3,
    retryDelayMs: 1,
    timeoutMs: 10_000,
  })

  const events = readFileSync(eventsPath, 'utf8')
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line))

  const failures = []
  if (events.length !== 5)
    failures.push(`expected 5 installer events, received ${events.length}`)
  for (const [index, event] of events.entries()) {
    for (const required of ['--backend=copyfile', '--linker=hoisted', '--concurrent-scripts=1', '--ignore-scripts']) {
      if (!event.args.includes(required))
        failures.push(`event ${index + 1} is missing ${required}`)
    }
  }
  for (const event of events.slice(0, 3)) {
    if (event.args.includes('--no-cache'))
      failures.push('shared-cache attempts must not use --no-cache')
  }
  if (!events[3]?.args.includes('--no-cache'))
    failures.push('the fourth event must be the isolated --no-cache rescue')
  if (events[3]?.args.includes('--frozen-lockfile'))
    failures.push('the initial isolated rescue must generate the lockfile before frozen verification')
  if (!events[4]?.args.includes('--frozen-lockfile'))
    failures.push('the fifth event must verify the generated lockfile')
  if (result.initial.mode !== 'isolated-rescue' || result.initial.attempts !== 4)
    failures.push(`unexpected initial result: ${JSON.stringify(result.initial)}`)
  if (result.frozen.mode !== 'shared-cache' || result.frozen.attempts !== 1)
    failures.push(`unexpected frozen result: ${JSON.stringify(result.frozen)}`)

  if (failures.length) {
    console.error('[nuxt-feathers-zod] Starter release installation resilience guard failed:')
    for (const failure of failures)
      console.error(`- ${failure}`)
    process.exitCode = 1
  }
  else {
    console.log('[nuxt-feathers-zod] Starter release installation is resilient: sharedAttempts=3 isolatedRescue=1 frozenVerification=true ignoreScripts=true.')
  }
}
finally {
  rmSync(root, { recursive: true, force: true })
}
