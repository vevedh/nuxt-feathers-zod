import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

function run(cmd: [string, ...string[]], cwd = process.cwd()) {
  const [bin, ...args] = cmd
  const res = spawnSync(bin, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env },
  })

  if (res.error) {
    throw new Error(`Command failed to start: ${cmd.join(' ')}\n${String(res.error)}`)
  }

  if (res.signal) {
    throw new Error(`Command terminated by signal ${res.signal}: ${cmd.join(' ')}`)
  }

  const exitCode = typeof res.status === 'number' ? res.status : null

  if (exitCode !== 0) {
    throw new Error(`Command failed (${String(exitCode)}): ${cmd.join(' ')}`)
  }
}

const bunBin = process.execPath
const cliEntrypoint = resolve(process.cwd(), 'bin/nuxt-feathers-zod')

// Smoke test the CLI entrypoint (no writes)
run([
  bunBin,
  cliEntrypoint,
  'add',
  'service',
  'ci-smoke-service',
  '--dry',
  'true',
  '--adapter',
  'mongodb',
  '--idField',
  '_id',
  '--path',
  'ci/smoke',
  '--docs',
  'true',
  '--auth',
  'true',
])

run([
  bunBin,
  cliEntrypoint,
  'add',
  'middleware',
  'ci-smoke-mw',
  '--dry',
  'true',
])

run([
  bunBin,
  cliEntrypoint,
  'add',
  'middleware',
  'ci-smoke-feathers-hook',
  '--target',
  'feathers',
  '--dry',
  'true',
])

console.log('CLI smoke OK')
