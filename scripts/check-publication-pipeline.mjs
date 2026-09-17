import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = path => readFileSync(resolve(root, path), 'utf8')
const pkg = JSON.parse(read('package.json'))
const scripts = pkg.scripts || {}
const failures = []

const requiredFiles = [
  'scripts/lib/release-artifact.mjs',
  'scripts/pack-release.mjs',
  'scripts/finalize-release.mjs',
  'scripts/check-release-artifact.mjs',
  'scripts/check-release-git-sync.mjs',
  'scripts/check-release-git-sync-regressions.mjs',
  'scripts/set-release-version.mjs',
  'scripts/check-prepack-ready.mjs',
  'scripts/block-direct-folder-publish.mjs',
  'scripts/validate-postgresql-release.mjs',
  'scripts/validate-mysql-mariadb-release.mjs',
  'scripts/validate-sqlite-release.mjs',
  'scripts/check-sqlite-certification.mjs',
  'scripts/validate-mssql-release.mjs',
  'scripts/check-mssql-certification.mjs',
  'scripts/validate-database-matrix-release.mjs',
  'scripts/check-database-certification-matrix.mjs',
]
for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file)))
    failures.push(`missing ${file}`)
}

const expectedScripts = {
  prepack: 'node scripts/check-prepack-ready.mjs',
  prepublishOnly: 'node scripts/block-direct-folder-publish.mjs',
  release: 'bun run release:prepare',
  'release:version': 'node scripts/set-release-version.mjs',
  'release:prepare': 'bun run release:check:registry && bun run release:check:full && bun run release:candidate && bun run release:verify:artifact && bun run release:finalize',
  'release:prepare:publish': 'bun run release:prepare',
  'release:publish': 'bun run publish:npm',
  'release:candidate': 'node scripts/pack-release.mjs',
  'release:verify:artifact': [
    'bun run test:postgresql:release',
    'bun run test:mysql-mariadb:release',
    'bun run test:sqlite:release',
    'bun run test:mssql:release',
    'bun run test:database-matrix:release',
    'bun run test:starter:release',
    'bun run smoke:tarball',
  ].join(' && '),
  'release:finalize': 'node scripts/finalize-release.mjs',
  'release:artifact:check': 'node scripts/check-release-artifact.mjs',
  'release:git:check': 'node scripts/check-release-git-sync.mjs',
  'release:git:check:tagged': 'node scripts/check-release-git-sync.mjs --tagged',
  'sanity:release-git-sync': 'node scripts/check-release-git-sync-regressions.mjs',
}
for (const [name, expected] of Object.entries(expectedScripts)) {
  if (scripts[name] !== expected)
    failures.push(`${name} must be ${JSON.stringify(expected)}`)
}


const expectedPublishScript = 'bun run release:git:check:tagged && bun run release:check:registry && bun run release:artifact:check && node scripts/publish-release.mjs'
if (scripts['publish:npm'] !== expectedPublishScript)
  failures.push(`publish:npm must be ${JSON.stringify(expectedPublishScript)}`)
for (const chain of ['prepare:project', 'verify:sanity', 'release:check']) {
  if (!scripts[chain]?.includes('bun run sanity:release-git-sync'))
    failures.push(`${chain} must run sanity:release-git-sync`)
}

const validationSources = new Map([
  ['test:postgresql:release', 'scripts/validate-postgresql-release.mjs'],
  ['test:mysql-mariadb:release', 'scripts/validate-mysql-mariadb-release.mjs'],
  ['test:sqlite:release', 'scripts/validate-sqlite-release.mjs'],
  ['test:mssql:release', 'scripts/validate-mssql-release.mjs'],
  ['test:database-matrix:release', 'scripts/validate-database-matrix-release.mjs'],
  ['test:starter:release', 'scripts/validate-starter-release.mjs'],
  ['smoke:tarball', 'scripts/smoke-tarball-install.mjs'],
])
for (const [name, path] of validationSources) {
  const source = read(path)
  if (!source.includes('resolveReleaseArtifact'))
    failures.push(`${name} must consume the existing release candidate`)
  if (source.includes("'pack'") || source.includes("'pm', 'pack'"))
    failures.push(`${name} must not create another tarball`)
}

const pack = read('scripts/pack-release.mjs')
for (const fragment of ['stagingDir', 'PACK_AND_PUBLISH_LIFECYCLE_SCRIPTS', 'sanitized-staging', '--ignore-scripts', '--json', 'paths.candidateManifest', 'Candidate SHA-256']) {
  if (!pack.includes(fragment))
    failures.push(`release candidate packer is missing ${fragment}`)
}
for (const forbidden of ["spawnSync(command, args, {\n  cwd: rootDir", "'pack', '--ignore-scripts'"]) {
  if (pack.includes(forbidden))
    failures.push(`release candidate packer must not pack the source tree directly: ${forbidden}`)
}

const finalize = read('scripts/finalize-release.mjs')
for (const fragment of [
  "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']",
  'promoteCandidate',
  'No build or test remains',
]) {
  if (!finalize.includes(fragment))
    failures.push(`release finalizer is missing ${fragment}`)
}

const publish = read('scripts/publish-release.mjs')
for (const fragment of [
  "['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']",
  'loadArtifactManifest',
  '--ignore-scripts',
  'exact validated tarball',
]) {
  if (!publish.includes(fragment))
    failures.push(`publisher is missing ${fragment}`)
}
if (publish.includes('release:prepare:publish'))
  failures.push('publisher must not rerun release preparation')

function assertReleaseOrder(source, label, commandPrefix = "'", occurrence = 'first') {
  const needle = command => commandPrefix === "'" ? `'${command}'` : `run: bun run ${command}`
  const locate = value => occurrence === 'last' ? source.lastIndexOf(value) : source.indexOf(value)
  const indexes = {
    candidate: locate(needle('release:candidate')),
    postgresql: locate(needle('test:postgresql:release')),
    mysqlMaria: locate(needle('test:mysql-mariadb:release')),
    sqlite: locate(needle('test:sqlite:release')),
    mssql: locate(needle('test:mssql:release')),
    matrix: locate(needle('test:database-matrix:release')),
    starter: locate(needle('test:starter:release')),
    consumer: locate(needle('smoke:tarball')),
    finalize: locate(needle('release:finalize')),
  }

  if (!(indexes.candidate >= 0
    && indexes.postgresql > indexes.candidate
    && indexes.mysqlMaria > indexes.postgresql
    && indexes.sqlite > indexes.mysqlMaria
    && indexes.mssql > indexes.sqlite
    && indexes.matrix > indexes.mssql
    && indexes.starter > indexes.matrix
    && indexes.consumer > indexes.starter
    && indexes.finalize > indexes.consumer)) {
    failures.push(`${label} must create one candidate, validate PostgreSQL/MySQL/MariaDB/SQLite/MSSQL/database-matrix/starter/consumer, then finalize it last`)
  }

  return indexes
}

const verifyWindows = read('scripts/verify-windows.ps1')
const githubCi = read('.github/workflows/ci.yml')
const publishWorkflow = read('.github/workflows/publish-npm.yml')
if (!publishWorkflow.includes('fetch-depth: 0'))
  failures.push('npm publish workflow must fetch full Git history for release source containment checks')
if (!publishWorkflow.includes('bun run release:git:check:tagged'))
  failures.push('npm publish workflow must verify that the tagged commit is synchronized with origin/main')
const windowsOrder = assertReleaseOrder(verifyWindows, 'Windows release gate', "'", 'last')
assertReleaseOrder(githubCi, 'GitHub CI release gate', 'run: bun run ')
assertReleaseOrder(publishWorkflow, 'npm publish workflow', 'run: bun run ')

if (windowsOrder.finalize >= 0) {
  const textAfterFinalize = verifyWindows.slice(windowsOrder.finalize + "'release:finalize'".length)
  if (/Invoke-BunCommand/.test(textAfterFinalize))
    failures.push('Windows release gate must not run another Bun script after finalization')
}

const npmrc = read('.npmrc')
for (const forbidden of ['shamefully-hoist', 'strict-peer-dependencies']) {
  if (npmrc.includes(forbidden))
    failures.push(`.npmrc must not contain unsupported npm option ${forbidden}`)
}

if (failures.length) {
  console.error('[release] Publication pipeline guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[release] Publication pipeline is single-artifact, immutable and publish-ready.')
