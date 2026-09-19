import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const installer = readFileSync(resolve(root, 'scripts/install-windows.mjs'), 'utf8')
const failures = []

for (const fragment of [
  "process.env.LOCALAPPDATA",
  "'--ignore-scripts'",
  "'--no-cache'",
  'isolated no-manifest-cache rescue attempt',
  "tmpdir()",
  "schemaVersion: 3",
  "fingerprintKind: 'dependency-resolution-v1'",
  "dependencyManifestSha256",
  "lockfileSha256",
  "npmrcSha256",
  "Dependency resolution inputs changed while node_modules still exists.",
  "shouldAttemptInPlaceReconciliation({",
  "Refusing destructive node_modules cleanup",
  "The tree was preserved instead of attempting a destructive cleanup",
  "without deleting node_modules",
  "ignoreScripts: true",
]) {
  if (!installer.includes(fragment))
    failures.push(`Windows installer is missing ${fragment}`)
}


const reconciliationIndex = installer.indexOf('shouldAttemptInPlaceReconciliation({')
const frozenMismatchGuardIndex = installer.indexOf('Refusing destructive node_modules cleanup')
const lockedTreeGuardIndex = installer.indexOf('The tree was preserved instead of attempting a destructive cleanup')
const firstDestructiveCleanupIndex = installer.indexOf("removeTree(nodeModules, 'the incomplete node_modules directory')")
if (reconciliationIndex === -1 || firstDestructiveCleanupIndex === -1 || reconciliationIndex > firstDestructiveCleanupIndex)
  failures.push('every existing stale or incomplete dependency tree must be reconciled before destructive node_modules cleanup')
if (frozenMismatchGuardIndex === -1 || frozenMismatchGuardIndex > firstDestructiveCleanupIndex)
  failures.push('frozen-lock mismatch must fail closed before destructive node_modules cleanup')
if (lockedTreeGuardIndex === -1 || lockedTreeGuardIndex > firstDestructiveCleanupIndex)
  failures.push('Windows file locks during in-place reconciliation must preserve node_modules before destructive cleanup')

const ignoreScriptCount = (installer.match(/'--ignore-scripts'/g) || []).length
if (ignoreScriptCount < 2)
  failures.push('both shared-cache and isolated rescue installs must disable lifecycle scripts')

if (failures.length) {
  console.error('[nuxt-feathers-zod] Windows install resilience guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Windows install lifecycle and isolated-cache recovery are aligned.')
