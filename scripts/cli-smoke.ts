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
const cliEntrypoint = resolve(process.cwd(), 'bin/nuxt-feathers-zod')

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
    auth: {
      authStrategies: ['local', 'jwt'],
      service: 'users',
      entity: 'user',
      local: {
        usernameField: 'email',
        passwordField: 'password',
        entityUsernameField: 'userId',
        entityPasswordField: 'passwordHash',
      },
    },
  },
})
`)

const doctorOutput = runCapture([
  bunBin,
  cliEntrypoint,
  'doctor',
], doctorRoot)

const expectedDoctorFragments = [
  '- auth.enabled: true',
  '- auth.authStrategies: local, jwt',
  '- auth.local.usernameField: email',
  '- auth.local.entityUsernameField: userId',
  "- auth.local.payload.example: { strategy: 'local', email: '<value>', password: '<value>' }",
  'Local auth request/entity field mapping differs.',
]

for (const fragment of expectedDoctorFragments) {
  if (!doctorOutput.includes(fragment)) {
    throw new Error(`Doctor smoke output is missing expected fragment: ${fragment}\n--- doctor output ---\n${doctorOutput}`)
  }
}

console.log('CLI smoke OK')
