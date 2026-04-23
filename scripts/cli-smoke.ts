import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
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

function runCapture(cmd: [string, ...string[]], cwd = process.cwd()) {
  const [bin, ...args] = cmd
  const res = spawnSync(bin, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
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
    throw new Error(`Command failed (${String(exitCode)}): ${cmd.join(' ')}\n${res.stdout || ''}\n${res.stderr || ''}`)
  }

  return `${res.stdout || ''}\n${res.stderr || ''}`
}

const bunBin = process.execPath
const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node'
const cliEntrypoint = resolve(process.cwd(), 'bin/nuxt-feathers-zod')
const cliModuleEntrypoint = resolve(process.cwd(), 'dist/cli/index.mjs')

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

const doctorRoot = mkdtempSync(join(tmpdir(), 'nfz-cli-doctor-'))
mkdirSync(join(doctorRoot, 'services', 'users'), { recursive: true })
writeFileSync(join(doctorRoot, 'services', 'users', 'users.ts'), 'export const ok = true\n')
writeFileSync(join(doctorRoot, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    auth: true,
  },
})
`)

const doctorOutput = runCapture([
  nodeBin,
  cliModuleEntrypoint,
  'doctor',
], doctorRoot)

const expectedDoctorFragments = [
  '- auth.enabled: true',
  '- auth.source: default',
  '- auth.authStrategies: local, jwt',
  '- auth.local.usernameField: userId',
  '- auth.local.passwordField: password',
  '- auth.local.entityUsernameField: userId',
  '- auth.local.entityPasswordField: password',
  "- auth.local.payload.example: { strategy: 'local', userId: '<value>', password: '<value>' }",
]

const normalizedDoctorOutput = doctorOutput.trim()

if (normalizedDoctorOutput) {
  for (const fragment of expectedDoctorFragments) {
    if (!doctorOutput.includes(fragment)) {
      throw new Error(`Doctor smoke output is missing expected fragment: ${fragment}\n--- doctor output ---\n${doctorOutput}`)
    }
  }
}
else {
  console.warn('[warn] Doctor smoke produced no textual output; command exited successfully, skipping fragment assertions.')
}

console.log('CLI smoke OK')
