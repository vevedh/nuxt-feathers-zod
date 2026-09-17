import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getReleasePaths, loadArtifactManifest, requireArtifactValidations } from './lib/release-artifact.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const paths = getReleasePaths(rootDir)
const candidate = loadArtifactManifest(rootDir, paths.candidateManifest, { expectedState: 'candidate' })
const required = ['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']
const valid = []
const missing = []
for (const name of required) {
  try {
    requireArtifactValidations(rootDir, candidate, [name])
    valid.push(name)
  }
  catch {
    missing.push(name)
  }
}

if (process.argv[2] === '--has-validation') {
  const name = process.argv[3]
  if (!required.includes(name))
    throw new Error(`Unknown release candidate validation: ${name || '(missing)'}`)
  process.exit(valid.includes(name) ? 0 : 2)
}

const payload = {
  packageName: candidate.packageJson.name,
  version: candidate.packageJson.version,
  tarball: candidate.tarballPath,
  sha256: candidate.sha256,
  valid,
  missing,
}

if (process.argv.includes('--json'))
  console.log(JSON.stringify(payload, null, 2))
else {
  console.log(`[release] Candidate: ${candidate.tarballName}`)
  console.log(`[release] SHA-256: ${candidate.sha256}`)
  console.log(`[release] Valid stamps: ${valid.length ? valid.join(', ') : '(none)'}`)
  console.log(`[release] Missing/stale stamps: ${missing.length ? missing.join(', ') : '(none)'}`)
}
