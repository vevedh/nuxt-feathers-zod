import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getReleasePaths, loadArtifactManifest } from './lib/release-artifact.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const paths = getReleasePaths(rootDir)
const artifact = loadArtifactManifest(rootDir, paths.finalManifest, { expectedState: 'final' })
const validations = new Set(artifact.manifest.validations || [])
for (const required of ['postgresql', 'starter', 'consumer']) {
  if (!validations.has(required))
    throw new Error(`[release-artifact] Final manifest is missing ${required} validation.`)
}

console.log(`[release-artifact] Ready: ${artifact.tarballName}`)
console.log(`[release-artifact] Version: ${artifact.packageJson.version}`)
console.log(`[release-artifact] SHA-256: ${artifact.sha256}`)
console.log(`[release-artifact] Validations: ${[...validations].join(', ')}`)
