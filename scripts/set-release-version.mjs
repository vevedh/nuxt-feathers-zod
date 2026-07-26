import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const packagePath = resolve(root, 'package.json')
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
const current = String(pkg.version || '')
const requested = String(process.argv.slice(2).find(value => value !== '--') || '').trim()

function bump(version, kind) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match)
    throw new Error(`Cannot ${kind}-bump non-stable version ${version}. Pass an explicit version.`)
  let [, major, minor, patch] = match.map(Number)
  if (kind === 'major') { major += 1; minor = 0; patch = 0 }
  else if (kind === 'minor') { minor += 1; patch = 0 }
  else patch += 1
  return `${major}.${minor}.${patch}`
}

if (!requested)
  throw new Error('Usage: bun run release:version -- <X.Y.Z|patch|minor|major>')

const next = ['patch', 'minor', 'major'].includes(requested) ? bump(current, requested) : requested
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(next))
  throw new Error(`Invalid release version: ${next}`)
if (next === current)
  throw new Error(`package.json is already at ${next}. Choose a new version.`)

pkg.version = next
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
execFileSync(process.execPath, [resolve(root, 'scripts/sync-release-metadata.mjs')], { cwd: root, stdio: 'inherit' })
execFileSync(process.execPath, [resolve(root, 'scripts/check-version-coherence.mjs')], { cwd: root, stdio: 'inherit' })
execFileSync(process.execPath, [resolve(root, 'scripts/check-release-metadata.mjs')], { cwd: root, stdio: 'inherit' })
console.log(`[release] Version aligned from ${current} to ${next}.`)
console.log('[release] Review CHANGELOG.md, then run the complete release verification.')
