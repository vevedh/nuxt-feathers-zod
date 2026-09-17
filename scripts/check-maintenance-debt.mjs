import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const lock = readFileSync(resolve(root, 'bun.lock'), 'utf8')
const problems = []
const sqliteCertification = readFileSync(resolve(root, 'scripts/validate-sqlite-release.mjs'), 'utf8')
const sqliteMatrix = readFileSync(resolve(root, 'scripts/validate-database-matrix-release.mjs'), 'utf8')

for (const forbidden of ['uuid', 'glob', 'better-sqlite3']) {
  if (Object.prototype.hasOwnProperty.call(pkg.overrides || {}, forbidden))
    problems.push(`unsafe root override for ${forbidden} must not be used to hide upstream deprecation debt`)
}

const signals = [
  ['uuid@8', lock.includes('request-oauth/uuid') && lock.includes('uuid@8.3.2'), '@feathersjs/authentication-oauth -> grant -> request-oauth'],
  ['glob@10', lock.includes('glob@10.5.0'), 'Nitro transitive tooling (@vercel/nft / archiver-utils)'],
]

if (pkg.peerDependencies?.['better-sqlite3'] !== '^11.0.0 || ^12.0.0')
  problems.push('better-sqlite3 public peer range must stay on the Windows-certified v11/v12 line until v13 install behavior is proven')
if (!sqliteCertification.includes("const BETTER_SQLITE3_VERSION = '12.11.1'"))
  problems.push('SQLite exact-candidate certification must remain pinned to better-sqlite3 12.11.1')
if (!sqliteMatrix.includes("const BETTER_SQLITE3_VERSION = '12.11.1'"))
  problems.push('cross-database matrix must remain pinned to better-sqlite3 12.11.1')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Maintenance debt policy failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

for (const [name, present, origin] of signals)
  console.log(`[maintenance] ${name}: ${present ? 'present' : 'not present'}; origin=${origin}`)
console.log('[maintenance] better-sqlite3: certified=12.11.1 peer=^11 || ^12; v13 deferred until its Windows/npm install path is proven without implicit node-gyp/Python requirements.')
console.log('[maintenance] DEP0155: observed through Nuxt/@nuxt/nitro-server -> @vue/shared export mapping; keep visible and track upstream rather than suppressing Node warnings.')
console.log('[maintenance] docs-private chunk warning: measured after VitePress builds; do not silence it with chunkSizeWarningLimit.')
console.log('[nuxt-feathers-zod] Maintenance debt is explicit and no unsafe major-version override is configured.')
