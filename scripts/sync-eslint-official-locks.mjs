import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { requireBunExecutable } from './lib/bun-executable.mjs'

const root = resolve(import.meta.dirname, '..')
const bun = requireBunExecutable()
const expectedBunVersion = '1.3.14'
const backupRoot = resolve(root, '.release-work', 'eslint-official-lock-backup')
const targets = [
  { name: 'root', cwd: root, packagePath: resolve(root, 'package.json'), lockPath: resolve(root, 'bun.lock') },
  { name: 'playground', cwd: resolve(root, 'playground'), packagePath: resolve(root, 'playground/package.json'), lockPath: resolve(root, 'playground/bun.lock') },
]

function run(command, args, cwd) {
  console.log(`[eslint:official] ${cwd}> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    stdio: 'inherit',
  })
  if (result.error)
    throw result.error
  if (result.status !== 0)
    throw new Error(`[eslint:official] Command exited with status ${result.status ?? 'unknown'} in ${cwd}.`)
}

function getBunVersion() {
  const result = spawnSync(bun, ['--version'], { cwd: root, encoding: 'utf8', shell: false })
  if (result.error || result.status !== 0)
    throw result.error || new Error(`Bun version lookup exited with status ${result.status ?? 'unknown'}.`)
  return String(result.stdout || '').trim()
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function verifyOfficialBoundary(target) {
  const lock = readFileSync(target.lockPath, 'utf8')
  if (lock.includes('@gabortorma/nuxt-eslint-layer'))
    throw new Error(`[eslint:official] ${target.name} bun.lock still contains @gabortorma/nuxt-eslint-layer.`)
  if (lock.includes('@gabortorma/antfu-eslint-config'))
    throw new Error(`[eslint:official] ${target.name} bun.lock still contains @gabortorma/antfu-eslint-config.`)

  if (!lock.includes('"@nuxt/eslint": "1.7.0"'))
    throw new Error(`[eslint:official] ${target.name} bun.lock workspace does not pin @nuxt/eslint to 1.7.0.`)
  if (!/^    "@nuxt\/eslint": \["@nuxt\/eslint@1\.7\.0"/m.test(lock))
    throw new Error(`[eslint:official] ${target.name} bun.lock does not resolve @nuxt/eslint@1.7.0.`)
}

const stalePlaygroundConfig = resolve(root, 'playground/eslint.config.mjs')
if (existsSync(stalePlaygroundConfig)) {
  rmSync(stalePlaygroundConfig, { force: true })
  console.log('[eslint:official] Removed stale playground/eslint.config.mjs; eslint.config.js is now authoritative.')
}

run(process.execPath, [resolve(root, 'scripts/check-eslint-provider.mjs'), '--source-only'], root)

const bunVersion = getBunVersion()
if (bunVersion !== expectedBunVersion) {
  throw new Error(
    `[eslint:official] Bun ${expectedBunVersion} is required to canonicalize the Patch073 lockfiles; found ${bunVersion || 'unknown'}.`,
  )
}

mkdirSync(backupRoot, { recursive: true })

for (const target of targets) {
  const packageHashBefore = sha256(target.packagePath)
  if (existsSync(target.lockPath))
    copyFileSync(target.lockPath, resolve(backupRoot, `${target.name}.bun.lock`))

  run(bun, [
    'install',
    '--lockfile-only',
    '--ignore-scripts',
    '--linker=hoisted',
    '--network-concurrency=8',
    '--no-progress',
  ], target.cwd)

  if (sha256(target.packagePath) !== packageHashBefore)
    throw new Error(`[eslint:official] ${target.name} package.json changed while canonicalizing bun.lock.`)

  run(bun, [
    'install',
    '--frozen-lockfile',
    '--lockfile-only',
    '--ignore-scripts',
    '--linker=hoisted',
    '--network-concurrency=8',
    '--no-progress',
  ], target.cwd)

  verifyOfficialBoundary(target)
  console.log(`[eslint:official] ${target.name} bun.lock canonical SHA-256=${sha256(target.lockPath)}`)
}

run(process.execPath, [resolve(root, 'scripts/check-eslint-provider.mjs')], root)
console.log('[eslint:official] Official Nuxt/Antfu ESLint migration lockfiles are canonical and frozen-lock verified.')
