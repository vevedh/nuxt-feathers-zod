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
  "schemaVersion: 2",
  "ignoreScripts=true",
]) {
  if (!installer.includes(fragment))
    failures.push(`Windows installer is missing ${fragment}`)
}

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
