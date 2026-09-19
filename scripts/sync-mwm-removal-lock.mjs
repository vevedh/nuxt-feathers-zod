#!/usr/bin/env bun
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const expectedBun = '1.3.14'
const bunVersion = process.versions.bun

if (bunVersion !== expectedBun) {
  throw new Error(`[mwm-removal] Bun ${expectedBun} is required to canonicalize bun.lock; current=${bunVersion ?? 'not running under Bun'}.`)
}

const packagePath = resolve(root, 'package.json')
const lockPath = resolve(root, 'bun.lock')
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))

for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  if (packageJson[field]?.['@gabortorma/mwm'])
    throw new Error(`[mwm-removal] package.json still declares @gabortorma/mwm in ${field}.`)
}

const backupDir = resolve(root, '.release-work', 'mwm-removal-lock-backup')
mkdirSync(backupDir, { recursive: true })
if (existsSync(lockPath))
  copyFileSync(lockPath, resolve(backupDir, 'bun.lock.pre-patch073-r9'))

const bun = process.execPath
const common = [
  'install',
  '--lockfile-only',
  '--ignore-scripts',
  '--linker=hoisted',
  '--network-concurrency=8',
  '--no-progress',
]

function run(args, label) {
  console.log(`[mwm-removal] ${label}: ${bun} ${args.join(' ')}`)
  const result = spawnSync(bun, args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error)
    throw result.error
  if (result.status !== 0)
    throw new Error(`[mwm-removal] ${label} failed with exit code ${result.status}.`)
}

run(common, 'canonical lock generation')
run(['install', '--frozen-lockfile', ...common.slice(1)], 'frozen lock verification')

const lock = readFileSync(lockPath, 'utf8')
if (lock.includes('@gabortorma/mwm'))
  throw new Error('[mwm-removal] canonical bun.lock still contains @gabortorma/mwm.')

const sha = createHash('sha256').update(lock).digest('hex')
console.log(`[mwm-removal] canonical bun.lock SHA-256=${sha}`)
console.log('[mwm-removal] Patch073 r9 root lock is canonical and frozen-lock verified with Bun 1.3.14.')
