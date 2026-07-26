import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getReleasePaths,
  loadArtifactManifest,
  promoteCandidate,
  requireArtifactValidations,
} from './lib/release-artifact.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const paths = getReleasePaths(rootDir)
const candidate = loadArtifactManifest(rootDir, paths.candidateManifest, { expectedState: 'candidate' })
const validations = requireArtifactValidations(rootDir, candidate, ['starter', 'consumer'])
const finalArtifact = promoteCandidate(rootDir, candidate, validations)

console.log(`[release] Final immutable tarball: ${finalArtifact.tarballPath}`)
console.log(`[release] Final SHA-256: ${finalArtifact.sha256}`)
console.log(`[release] Manifest: ${finalArtifact.manifestPath}`)
console.log('[release] No build or test remains. Publish this exact artifact with "bun run publish:npm".')
