import { createHash } from 'node:crypto'

const DEPENDENCY_RESOLUTION_FIELDS = Object.freeze([
  'packageManager',
  'engines',
  'os',
  'cpu',
  'libc',
  'workspaces',
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'bundledDependencies',
  'bundleDependencies',
  'overrides',
  'resolutions',
  'trustedDependencies',
])

function canonicalize(value) {
  if (Array.isArray(value))
    return value.map(item => canonicalize(item))

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    )
  }

  return value
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function selectDependencyResolutionManifest(packageJson) {
  const selected = {}
  for (const field of DEPENDENCY_RESOLUTION_FIELDS) {
    if (packageJson[field] !== undefined)
      selected[field] = packageJson[field]
  }
  return canonicalize(selected)
}

export function createWindowsInstallFingerprint({
  packageJsonText,
  lockfileBytes,
  npmrcBytes = Buffer.from(''),
  bunVersion,
  frozenLockfile = true,
  ignoreScripts = true,
}) {
  const packageJson = JSON.parse(String(packageJsonText || '{}'))
  const dependencyManifest = selectDependencyResolutionManifest(packageJson)
  const dependencyManifestJson = JSON.stringify(dependencyManifest)
  const dependencyManifestSha256 = sha256(dependencyManifestJson)
  const lockfileSha256 = sha256(lockfileBytes || Buffer.from(''))
  const npmrcSha256 = sha256(npmrcBytes || Buffer.from(''))

  const fingerprint = sha256([
    'nfz-windows-install-fingerprint-v1',
    `dependencyManifest=${dependencyManifestSha256}`,
    `lockfile=${lockfileSha256}`,
    `npmrc=${npmrcSha256}`,
    `bun=${String(bunVersion || '')}`,
    `frozen=${String(Boolean(frozenLockfile))}`,
    `ignoreScripts=${String(Boolean(ignoreScripts))}`,
  ].join('\n'))

  return {
    fingerprint,
    dependencyManifestSha256,
    lockfileSha256,
    npmrcSha256,
  }
}
