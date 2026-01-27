import { spawnSync } from 'node:child_process'
import process from 'node:process'

function run(cmd: string[], cwd = process.cwd()) {
  const [bin, ...args] = cmd
  const res = spawnSync(bin, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env },
  })
  if (res.status !== 0) {
    throw new Error(`Command failed (${res.status}): ${cmd.join(' ')}`)
  }
}

// Smoke test the CLI entrypoint (no writes)
run([
  'bun',
  'bin/nuxt-feathers-zod',
  'add',
  'service',
  'ci-smoke-service',
  '--dry',
  '--adapter',
  'mongodb',
  '--idField',
  '_id',
  '--path',
  'ci/smoke',
  '--docs',
  '--auth',
])

run([
  'bun',
  'bin/nuxt-feathers-zod',
  'add',
  'middleware',
  'ci-smoke-mw',
  '--dry',
])

run([
  'bun',
  'bin/nuxt-feathers-zod',
  'add',
  'middleware',
  'ci-smoke-feathers-hook',
  '--target',
  'feathers',
  '--dry',
])

console.log('CLI smoke OK')
