import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveNpmCliPath } from './lib/npm-cli.mjs'
import {
  createArtifactManifest,
  resetCandidateWorkspace,
  validateTarball,
  writeJson,
} from './lib/release-artifact.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const paths = resetCandidateWorkspace(rootDir)
const stagingDir = resolve(paths.workDir, 'staging')

const PACK_AND_PUBLISH_LIFECYCLE_SCRIPTS = new Set([
  'prepublish',
  'prepare',
  'prepublishOnly',
  'prepack',
  'postpack',
  'publish',
  'postpublish',
])

for (const required of ['dist/module.mjs', 'dist/cli/index.mjs']) {
  if (!existsSync(resolve(rootDir, required))) {
    console.error(`[release] Missing ${required}. Run the source validation/build before creating a candidate.`)
    process.exit(1)
  }
}

function assertSafePackageEntry(entry) {
  if (typeof entry !== 'string' || !entry.trim())
    throw new Error('package.json#files contains an invalid empty entry.')
  if (/[*?[\]{}!]/.test(entry))
    throw new Error(`package.json#files entry ${JSON.stringify(entry)} uses a glob. The immutable packer requires explicit paths.`)

  const source = resolve(rootDir, entry)
  const rel = relative(rootDir, source)
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`))
    throw new Error(`package.json#files entry ${JSON.stringify(entry)} escapes the project root.`)
  if (!existsSync(source))
    throw new Error(`package.json#files entry ${JSON.stringify(entry)} does not exist.`)
  return { source, destination: resolve(stagingDir, entry) }
}

function createStagingPackage() {
  rmSync(stagingDir, { recursive: true, force: true })
  mkdirSync(stagingDir, { recursive: true })

  const fileEntries = Array.isArray(packageJson.files) ? packageJson.files : []
  if (!fileEntries.length)
    throw new Error('package.json#files must explicitly define the published package surface.')

  for (const entry of fileEntries) {
    const { source, destination } = assertSafePackageEntry(entry)
    mkdirSync(dirname(destination), { recursive: true })
    cpSync(source, destination, {
      recursive: true,
      dereference: true,
      preserveTimestamps: true,
      force: true,
    })
  }

  const stagedPackageJson = structuredClone(packageJson)
  stagedPackageJson.scripts = Object.fromEntries(
    Object.entries(stagedPackageJson.scripts || {})
      .filter(([name]) => !PACK_AND_PUBLISH_LIFECYCLE_SCRIPTS.has(name)),
  )
  stagedPackageJson.nfzReleaseArtifact = {
    immutable: true,
    sourceVersion: packageJson.version,
    lifecycleHooksRemoved: [...PACK_AND_PUBLISH_LIFECYCLE_SCRIPTS]
      .filter(name => Object.hasOwn(packageJson.scripts || {}, name)),
  }

  writeFileSync(
    resolve(stagingDir, 'package.json'),
    `${JSON.stringify(stagedPackageJson, null, 2)}\n`,
  )

  return stagedPackageJson
}

let stagedPackageJson
try {
  stagedPackageJson = createStagingPackage()
}
catch (error) {
  console.error(`[release] Unable to prepare immutable package staging: ${error.message}`)
  process.exit(1)
}

const npmCliPath = resolveNpmCliPath()
const command = npmCliPath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm')
const args = npmCliPath
  ? [npmCliPath, 'pack', stagingDir, '--ignore-scripts', '--json', '--pack-destination', paths.candidateDir]
  : ['pack', stagingDir, '--ignore-scripts', '--json', '--pack-destination', paths.candidateDir]

console.log('[release] Packing the sanitized staging directory. Source lifecycle hooks cannot run during candidate creation.')
const result = spawnSync(command, args, {
  cwd: paths.workDir,
  encoding: 'utf8',
  shell: !npmCliPath && process.platform === 'win32',
})

if (result.error) {
  console.error(`[release] Unable to start npm pack: ${result.error.message}`)
  process.exit(1)
}
if (result.status !== 0) {
  process.stderr.write(result.stderr || '')
  process.stdout.write(result.stdout || '')
  process.exit(result.status ?? 1)
}

let tarballName
try {
  const parsed = JSON.parse(result.stdout || '[]')
  const record = Array.isArray(parsed) ? parsed[0] : parsed
  tarballName = record?.filename ? basename(record.filename) : undefined
}
catch {}

if (!tarballName) {
  tarballName = readdirSync(paths.candidateDir).find(name => /^nuxt-feathers-zod-.*\.tgz$/.test(name))
}
if (!tarballName) {
  console.error('[release] npm pack did not produce the expected tarball.')
  process.exit(1)
}

const artifact = validateTarball(resolve(paths.candidateDir, tarballName), {
  expectedName: packageJson.name,
  expectedVersion: packageJson.version,
})
for (const hook of PACK_AND_PUBLISH_LIFECYCLE_SCRIPTS) {
  if (Object.hasOwn(artifact.packageJson.scripts || {}, hook)) {
    console.error(`[release] Candidate unexpectedly contains lifecycle hook ${hook}.`)
    process.exit(1)
  }
}
if (artifact.packageJson.nfzReleaseArtifact?.immutable !== true)
  throw new Error('[release] Candidate is missing immutable release metadata.')
if (artifact.packageJson.name !== stagedPackageJson.name || artifact.packageJson.version !== stagedPackageJson.version)
  throw new Error('[release] Candidate metadata differs from the sanitized staging package.')

const manifest = createArtifactManifest(rootDir, artifact, {
  state: 'candidate',
  packaging: {
    source: 'sanitized-staging',
    sourceLifecycleHooksExecuted: false,
    lifecycleHooksRemoved: artifact.packageJson.nfzReleaseArtifact.lifecycleHooksRemoved,
  },
})
writeJson(paths.candidateManifest, manifest)

console.log(`[release] Candidate tarball created: ${artifact.tarballPath}`)
console.log(`[release] Candidate SHA-256: ${artifact.sha256}`)
console.log('[release] The candidate must pass starter and clean-consumer validation before finalization.')
