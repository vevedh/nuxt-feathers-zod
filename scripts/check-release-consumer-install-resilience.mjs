#!/usr/bin/env node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import {
  createExactReleaseConsumerPackage,
  installExactReleaseConsumer,
  resolveReleaseConsumerInstallPolicy,
  resolveReleaseConsumerPlatform,
} from './lib/release-consumer-install.mjs'

const root = process.cwd()
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const failures = []

const policy = resolveReleaseConsumerInstallPolicy({})
if (policy.timeoutMs !== 15 * 60 * 1000)
  failures.push(`default release consumer install timeout must be 15 minutes, found ${policy.timeoutMs}`)
if (policy.attempts !== 2)
  failures.push(`default release consumer install attempts must be 2, found ${policy.attempts}`)
if (policy.networkConcurrency !== 8)
  failures.push(`default release consumer network concurrency must be 8, found ${policy.networkConcurrency}`)

const overridden = resolveReleaseConsumerInstallPolicy({
  NFZ_RELEASE_CONSUMER_INSTALL_TIMEOUT_MS: '12345',
  NFZ_RELEASE_CONSUMER_INSTALL_ATTEMPTS: '3',
  NFZ_RELEASE_CONSUMER_INSTALL_RETRY_DELAY_MS: '7',
  NFZ_RELEASE_CONSUMER_NETWORK_CONCURRENCY: '4',
})
if (
  overridden.timeoutMs !== 12345
  || overridden.attempts !== 3
  || overridden.retryDelayMs !== 7
  || overridden.networkConcurrency !== 4
) {
  failures.push('release consumer install environment overrides are not honored')
}

const platform = resolveReleaseConsumerPlatform(root)
if (platform.nuxt !== '4.5.2')
  failures.push(`certified consumer Nuxt must be 4.5.2, found ${platform.nuxt}`)
for (const [key, expected] of Object.entries({ nuxt: '4.5.2', vite: '8.2.2', rolldown: '1.2.4', vue: '3.5.42', typescript: '5.9.3', zod: '3.25.76' })) {
  if (platform.dependencies[key] !== expected)
    failures.push(`certified full consumer direct dependency ${key} must be ${expected}, found ${platform.dependencies[key]}`)
}
if (Object.keys(platform.databaseDependencies).length !== 1 || platform.databaseDependencies.zod !== '3.25.76')
  failures.push('database consumer profile must keep only the required zod peer explicit')
for (const [key, expected] of Object.entries({ vite: '8.2.2', rolldown: '1.2.4', vue: '3.5.42', typescript: '5.9.3' })) {
  if (platform.overrides[key] !== expected)
    failures.push(`certified consumer override ${key} must be ${expected}, found ${platform.overrides[key]}`)
}
if (platform.feathersVersion !== '5.0.49')
  failures.push(`certified consumer Feathers family must converge on 5.0.49, found ${platform.feathersVersion}`)
for (const key of ['@feathersjs/adapter-commons', '@feathersjs/authentication', '@feathersjs/feathers', '@feathersjs/knex', '@feathersjs/schema']) {
  if (platform.overrides[key] !== '5.0.49')
    failures.push(`certified consumer override ${key} must stay on 5.0.49`)
}

const fullPackage = createExactReleaseConsumerPackage({
  root,
  name: 'release-consumer-platform-smoke',
  dependencies: { example: '1.0.0' },
})
for (const [key, expected] of Object.entries({ nuxt: '4.5.2', vite: '8.2.2', rolldown: '1.2.4', vue: '3.5.42', typescript: '5.9.3', zod: '3.25.76' })) {
  if (fullPackage.dependencies[key] !== expected)
    failures.push(`full release consumer package must explicitly pin certified dependency ${key}@${expected}`)
}
if (fullPackage.dependencies.example !== '1.0.0')
  failures.push('full release consumer package must preserve caller dependencies')

const databasePackage = createExactReleaseConsumerPackage({
  root,
  name: 'release-consumer-database-smoke',
  profile: 'database',
  dependencies: { example: '1.0.0' },
})
for (const key of ['nuxt', 'vite', 'rolldown', 'vue', 'typescript']) {
  if (databasePackage.dependencies[key])
    failures.push(`database release consumer must not directly install ${key}`)
}
if (databasePackage.dependencies.zod !== '3.25.76')
  failures.push('database release consumer must explicitly satisfy the Zod peer')
if (databasePackage.dependencies.example !== '1.0.0')
  failures.push('database release consumer package must preserve caller dependencies')

for (const exactPackage of [fullPackage, databasePackage]) {
  for (const [key, expected] of Object.entries({ vite: '8.2.2', rolldown: '1.2.4', vue: '3.5.42', typescript: '5.9.3' })) {
    if (exactPackage.overrides[key] !== expected)
      failures.push(`exact release consumer package must inherit certified ${key} override ${expected}`)
  }
  for (const key of ['@feathersjs/adapter-commons', '@feathersjs/authentication', '@feathersjs/feathers', '@feathersjs/knex', '@feathersjs/schema']) {
    if (exactPackage.overrides[key] !== '5.0.49')
      failures.push(`exact release consumer package must pin ${key} to 5.0.49`)
  }
}

const smokeDir = mkdtempSync(join(tmpdir(), 'nfz-release-consumer-smoke-'))
try {
  writeFileSync(join(smokeDir, 'package.json'), '{"name":"smoke","private":true}\n')
  mkdirSync(join(smokeDir, 'node_modules'), { recursive: true })
  writeFileSync(join(smokeDir, 'bun.lock'), 'partial\n')
  writeFileSync(join(smokeDir, 'package-lock.json'), '{}\n')

  let calls = 0
  const fakeResults = [
    { error: Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }), status: null },
    { error: undefined, status: 0 },
  ]
  const recovery = installExactReleaseConsumer({
    cwd: smokeDir,
    label: 'release-consumer-smoke',
    env: {
      NFZ_RELEASE_CONSUMER_INSTALL_TIMEOUT_MS: '50',
      NFZ_RELEASE_CONSUMER_INSTALL_ATTEMPTS: '2',
      NFZ_RELEASE_CONSUMER_INSTALL_RETRY_DELAY_MS: '1',
      NFZ_RELEASE_CONSUMER_NETWORK_CONCURRENCY: '8',
    },
    bunExecutable: '/fake/bun',
    runner(_command, args) {
      if (!args.includes('--backend=copyfile'))
        failures.push('exact-candidate Bun install must use the copyfile backend for Windows-safe fixture materialization')
      if (!args.includes('--linker=hoisted'))
        failures.push('exact-candidate Bun install must use the hoisted linker for Node consumer compatibility')
      if (!args.includes('--ignore-scripts'))
        failures.push('exact-candidate Bun install must keep dependency lifecycle scripts disabled')
      if (!args.includes('--omit=peer'))
        failures.push('database exact-candidate Bun install must omit automatic peer installation')
      if (args.includes('--legacy-peer-deps'))
        failures.push('database exact-candidate Bun install must not carry npm-only legacy peer flags')
      const expectedConcurrency = calls === 0 ? '--network-concurrency=8' : '--network-concurrency=2'
      if (!args.includes(expectedConcurrency))
        failures.push(`release consumer attempt ${calls + 1} must use ${expectedConcurrency}`)
      return fakeResults[calls++]
    },
    sleep() {},
  })
  if (recovery.installer !== 'bun' || recovery.attemptsUsed !== 2 || calls !== 2)
    failures.push('release consumer Bun install retry does not recover after a bounded timeout')
  if (readFileSync(join(smokeDir, 'package.json'), 'utf8').includes('smoke') === false)
    failures.push('release consumer retry cleanup must preserve package.json')
  for (const relative of ['bun.lock', 'package-lock.json']) {
    try {
      readFileSync(join(smokeDir, relative), 'utf8')
      failures.push(`release consumer retry must clear a partial ${relative} before retry`)
    }
    catch {}
  }
}
finally {
  rmSync(smokeDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

for (const file of [
  'scripts/validate-postgresql-release.mjs',
  'scripts/validate-mysql-mariadb-release.mjs',
  'scripts/validate-sqlite-release.mjs',
  'scripts/validate-mssql-release.mjs',
  'scripts/validate-database-matrix-release.mjs',
]) {
  const source = read(file)
  if (!source.includes("createExactReleaseConsumerPackage, installExactReleaseConsumer"))
    failures.push(`${file} must use the shared deterministic consumer package builder and installer`)
  if (!source.includes("profile: 'database'"))
    failures.push(`${file} must use the database consumer profile and avoid the Nuxt peer tree`)
  if (source.includes('const INSTALL_TIMEOUT_MS ='))
    failures.push(`${file} must not retain a private fixed consumer install timeout`)
}

const smokeSource = read('scripts/smoke-tarball-install.mjs')
if (!smokeSource.includes("import { createExactReleaseConsumerPackage } from './lib/release-consumer-install.mjs'"))
  failures.push('clean tarball consumer smoke must use the deterministic certified-platform package builder')
if (smokeSource.includes("nuxt: '^4.3.1'"))
  failures.push('clean tarball consumer smoke must not float Nuxt through a broad range')
if (!smokeSource.includes("'--legacy-peer-deps'"))
  failures.push('clean npm tarball smoke must retain the scoped npm Arborist peer-resolution workaround')

if (failures.length) {
  console.error('[nuxt-feathers-zod] Release consumer install resilience guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Exact-candidate consumers are deterministic and resilient: databaseInstaller=bun databaseProfile=omit-peer nuxtSmokeInstaller=npm nuxt=4.5.2 vite=8.2.2 rolldown=1.2.4 vue=3.5.42 typescript=5.9.3 zod=3.25.76 feathers=5.0.49 timeout=15m attempts=2 cleanRetry=true networkBackoff=8->2 configurable=true.')
