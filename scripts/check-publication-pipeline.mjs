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
  'scripts/set-release-version.mjs',
  'scripts/check-prepack-ready.mjs',
  'scripts/block-direct-folder-publish.mjs',
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
  'release:verify:artifact': 'bun run test:postgresql:release && bun run test:starter:release && bun run smoke:tarball',
  'release:finalize': 'node scripts/finalize-release.mjs',
  'release:artifact:check': 'node scripts/check-release-artifact.mjs',
}
for (const [name, expected] of Object.entries(expectedScripts)) {
  if (scripts[name] !== expected)
    failures.push(`${name} must be ${JSON.stringify(expected)}`)
}

for (const name of ['test:postgresql:release', 'test:starter:release', 'smoke:tarball']) {
  const source = read(name === 'test:postgresql:release'
    ? 'scripts/validate-postgresql-release.mjs'
    : name === 'test:starter:release' ? 'scripts/validate-starter-release.mjs' : 'scripts/smoke-tarball-install.mjs')
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
for (const fragment of ["['postgresql', 'starter', 'consumer']", 'promoteCandidate', 'No build or test remains']) {
  if (!finalize.includes(fragment))
    failures.push(`release finalizer is missing ${fragment}`)
}

const publish = read('scripts/publish-release.mjs')
for (const fragment of ['loadArtifactManifest', '--ignore-scripts', 'exact validated tarball']) {
  if (!publish.includes(fragment))
    failures.push(`publisher is missing ${fragment}`)
}
if (publish.includes('release:prepare:publish'))
  failures.push('publisher must not rerun release preparation')

const verifyWindows = read('scripts/verify-windows.ps1')
const candidateIndex = verifyWindows.indexOf("'release:candidate'")
const postgresqlIndex = verifyWindows.indexOf("'test:postgresql:release'")
const starterIndex = verifyWindows.indexOf("'test:starter:release'")
const smokeIndex = verifyWindows.indexOf("'smoke:tarball'")
const finalizeIndex = verifyWindows.indexOf("'release:finalize'")
if (!(candidateIndex >= 0 && postgresqlIndex > candidateIndex && starterIndex > postgresqlIndex
  && smokeIndex > starterIndex && finalizeIndex > smokeIndex)) {
  failures.push('Windows release gate must create one candidate, validate PostgreSQL/starter/consumer, then finalize it last')
}
const textAfterFinalize = verifyWindows.slice(finalizeIndex + "'release:finalize'".length)
if (/Invoke-BunCommand/.test(textAfterFinalize))
  failures.push('Windows release gate must not run another Bun script after finalization')

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
