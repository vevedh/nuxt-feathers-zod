import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'

export const RELEASE_ARTIFACT_SCHEMA = 1

export function getReleasePaths(rootDir) {
  const workDir = resolve(rootDir, '.release-work')
  const candidateDir = resolve(workDir, 'candidate')
  const validationDir = resolve(workDir, 'validations')
  const finalDir = resolve(rootDir, 'release-artifacts')

  return {
    rootDir,
    workDir,
    candidateDir,
    candidateManifest: resolve(candidateDir, 'release-candidate.json'),
    validationDir,
    finalDir,
    finalManifest: resolve(finalDir, 'release-manifest.json'),
  }
}

export function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function readTarString(buffer, start, length) {
  return buffer.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '').trim()
}

function readTarSize(buffer, start, length) {
  const text = readTarString(buffer, start, length).replace(/[^0-7]/g, '')
  return text ? Number.parseInt(text, 8) : 0
}

export function readPackageJsonFromTarball(tarballPath) {
  const tar = gunzipSync(readFileSync(tarballPath))
  let offset = 0

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0))
      break

    const name = readTarString(header, 0, 100)
    const prefix = readTarString(header, 345, 155)
    const fullName = prefix ? `${prefix}/${name}` : name
    const size = readTarSize(header, 124, 12)
    const bodyStart = offset + 512
    const bodyEnd = bodyStart + size

    if (fullName === 'package/package.json' || fullName === './package/package.json') {
      return JSON.parse(tar.subarray(bodyStart, bodyEnd).toString('utf8'))
    }

    offset = bodyStart + Math.ceil(size / 512) * 512
  }

  throw new Error(`[release-artifact] package/package.json was not found in ${tarballPath}`)
}

export function validateTarball(tarballPath, { expectedName, expectedVersion } = {}) {
  if (!existsSync(tarballPath))
    throw new Error(`[release-artifact] Missing tarball: ${tarballPath}`)

  const packageJson = readPackageJsonFromTarball(tarballPath)
  if (expectedName && packageJson.name !== expectedName) {
    throw new Error(
      `[release-artifact] Tarball package name ${packageJson.name || '<missing>'} does not match ${expectedName}.`,
    )
  }
  if (expectedVersion && packageJson.version !== expectedVersion) {
    throw new Error(
      `[release-artifact] Tarball version ${packageJson.version || '<missing>'} does not match ${expectedVersion}.`,
    )
  }

  return {
    packageJson,
    tarballPath,
    tarballName: basename(tarballPath),
    sha256: sha256File(tarballPath),
    size: statSync(tarballPath).size,
  }
}

export function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function resolveManifestTarball(rootDir, manifestPath, manifest) {
  const declared = String(manifest.tarball || '').trim()
  if (!declared)
    throw new Error(`[release-artifact] ${manifestPath} does not declare a tarball.`)
  return isAbsolute(declared) ? declared : resolve(rootDir, declared)
}

export function loadArtifactManifest(rootDir, manifestPath, { expectedState } = {}) {
  if (!existsSync(manifestPath))
    throw new Error(`[release-artifact] Missing artifact manifest: ${manifestPath}`)

  const manifest = readJson(manifestPath)
  if (manifest.schemaVersion !== RELEASE_ARTIFACT_SCHEMA)
    throw new Error(`[release-artifact] Unsupported artifact manifest schema in ${manifestPath}.`)
  if (expectedState && manifest.state !== expectedState)
    throw new Error(`[release-artifact] Expected ${expectedState} artifact, received ${manifest.state || '<missing>'}.`)

  const tarballPath = resolveManifestTarball(rootDir, manifestPath, manifest)
  const artifact = validateTarball(tarballPath, {
    expectedName: manifest.packageName,
    expectedVersion: manifest.version,
  })
  if (artifact.sha256 !== manifest.sha256)
    throw new Error(`[release-artifact] SHA-256 mismatch for ${tarballPath}.`)
  if (artifact.size !== manifest.size)
    throw new Error(`[release-artifact] Size mismatch for ${tarballPath}.`)

  return { ...artifact, manifest, manifestPath }
}

export function parseTarballArgument(argv = process.argv.slice(2)) {
  const inline = argv.find(value => value.startsWith('--tarball='))
  if (inline)
    return inline.slice('--tarball='.length)
  const index = argv.indexOf('--tarball')
  return index >= 0 ? argv[index + 1] : undefined
}

export function resolveReleaseArtifact(rootDir, { allowFinal = true, argv = process.argv.slice(2) } = {}) {
  const explicit = parseTarballArgument(argv) || process.env.NFZ_RELEASE_TARBALL
  const rootPackage = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))

  if (explicit) {
    const tarballPath = isAbsolute(explicit) ? explicit : resolve(rootDir, explicit)
    const artifact = validateTarball(tarballPath, {
      expectedName: rootPackage.name,
      expectedVersion: rootPackage.version,
    })
    return { ...artifact, state: 'explicit', manifest: undefined }
  }

  const paths = getReleasePaths(rootDir)
  if (existsSync(paths.candidateManifest)) {
    const artifact = loadArtifactManifest(rootDir, paths.candidateManifest, { expectedState: 'candidate' })
    return { ...artifact, state: 'candidate' }
  }
  if (allowFinal && existsSync(paths.finalManifest)) {
    const artifact = loadArtifactManifest(rootDir, paths.finalManifest, { expectedState: 'final' })
    return { ...artifact, state: 'final' }
  }

  throw new Error(
    '[release-artifact] No release candidate exists. Run "bun run release:candidate" first, '
    + 'or pass --tarball <path>.',
  )
}

export function resetCandidateWorkspace(rootDir) {
  const paths = getReleasePaths(rootDir)
  rmSync(paths.candidateDir, { recursive: true, force: true })
  rmSync(paths.validationDir, { recursive: true, force: true })
  mkdirSync(paths.candidateDir, { recursive: true })
  mkdirSync(paths.validationDir, { recursive: true })
  return paths
}

export function createArtifactManifest(rootDir, artifact, { state, validations = [], ...metadata } = {}) {
  return {
    schemaVersion: RELEASE_ARTIFACT_SCHEMA,
    state,
    packageName: artifact.packageJson.name,
    version: artifact.packageJson.version,
    tarball: relative(rootDir, artifact.tarballPath).replace(/\\/g, '/'),
    tarballName: artifact.tarballName,
    sha256: artifact.sha256,
    size: artifact.size,
    validations,
    ...metadata,
  }
}

export function recordArtifactValidation(rootDir, validationName, artifact, details = {}) {
  const paths = getReleasePaths(rootDir)
  const stampPath = resolve(paths.validationDir, `${validationName}.json`)
  writeJson(stampPath, {
    schemaVersion: RELEASE_ARTIFACT_SCHEMA,
    validation: validationName,
    packageName: artifact.packageJson.name,
    version: artifact.packageJson.version,
    sha256: artifact.sha256,
    ...details,
  })
  return stampPath
}

export function requireArtifactValidations(rootDir, artifact, requiredNames) {
  const paths = getReleasePaths(rootDir)
  const validations = []

  for (const name of requiredNames) {
    const stampPath = resolve(paths.validationDir, `${name}.json`)
    if (!existsSync(stampPath))
      throw new Error(`[release-artifact] Missing ${name} validation for the release candidate.`)
    const stamp = readJson(stampPath)
    if (
      stamp.schemaVersion !== RELEASE_ARTIFACT_SCHEMA
      || stamp.validation !== name
      || stamp.packageName !== artifact.packageJson.name
      || stamp.version !== artifact.packageJson.version
      || stamp.sha256 !== artifact.sha256
    ) {
      throw new Error(`[release-artifact] ${name} validation does not match the current release candidate.`)
    }
    validations.push(name)
  }

  return validations
}

export function promoteCandidate(rootDir, artifact, validations) {
  const paths = getReleasePaths(rootDir)
  mkdirSync(paths.finalDir, { recursive: true })

  for (const entry of ['release-manifest.json', `${artifact.packageJson.name}-${artifact.packageJson.version}.sha256.txt`])
    rmSync(resolve(paths.finalDir, entry), { force: true })

  const finalTarball = resolve(paths.finalDir, artifact.tarballName)
  const temporaryTarball = `${finalTarball}.tmp`
  rmSync(temporaryTarball, { force: true })
  copyFileSync(artifact.tarballPath, temporaryTarball)
  renameSync(temporaryTarball, finalTarball)

  const finalArtifact = validateTarball(finalTarball, {
    expectedName: artifact.packageJson.name,
    expectedVersion: artifact.packageJson.version,
  })
  if (finalArtifact.sha256 !== artifact.sha256)
    throw new Error('[release-artifact] Candidate hash changed during final promotion.')

  const manifest = createArtifactManifest(rootDir, finalArtifact, {
    state: 'final',
    validations,
  })
  writeJson(paths.finalManifest, manifest)
  writeFileSync(
    resolve(paths.finalDir, `${artifact.packageJson.name}-${artifact.packageJson.version}.sha256.txt`),
    `${finalArtifact.sha256}  ${finalArtifact.tarballName}\n`,
  )

  return { ...finalArtifact, manifest, manifestPath: paths.finalManifest }
}
