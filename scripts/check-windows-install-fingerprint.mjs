import { createWindowsInstallFingerprint } from './lib/windows-install-fingerprint.mjs'

const failures = []

function expect(condition, message) {
  if (!condition)
    failures.push(message)
}

const basePackage = {
  name: 'nuxt-feathers-zod',
  version: '6.8.0',
  scripts: { test: 'vitest run' },
  exports: { '.': './dist/module.mjs' },
  packageManager: 'bun@1.3.14',
  engines: { node: '^22.19.0', bun: '>=1.3.6' },
  dependencies: { nuxt: '4.5.2', zod: '3.25.76' },
  devDependencies: { vitest: '4.1.11' },
  peerDependencies: { vue: '^3.5.0' },
  peerDependenciesMeta: { vue: { optional: true } },
  overrides: { vite: '8.2.2' },
}

function fingerprint(packageJson, { lockfile = 'lock-v1', npmrc = 'registry=https://registry.npmjs.org/', bunVersion = '1.3.14' } = {}) {
  return createWindowsInstallFingerprint({
    packageJsonText: JSON.stringify(packageJson),
    lockfileBytes: Buffer.from(lockfile),
    npmrcBytes: Buffer.from(npmrc),
    bunVersion,
    frozenLockfile: true,
    ignoreScripts: true,
  })
}

const base = fingerprint(basePackage)
const metadataOnly = fingerprint({
  ...basePackage,
  version: '6.8.1',
  description: 'metadata-only change',
  scripts: { test: 'vitest run', lint: 'eslint .' },
  exports: { '.': './dist/changed-module.mjs' },
})
expect(base.fingerprint === metadataOnly.fingerprint, 'version/scripts/exports metadata must not invalidate the dependency install state')

const reordered = fingerprint({
  ...basePackage,
  dependencies: { zod: '3.25.76', nuxt: '4.5.2' },
})
expect(base.fingerprint === reordered.fingerprint, 'dependency key ordering must not change the fingerprint')

const dependencyChanged = fingerprint({
  ...basePackage,
  dependencies: { ...basePackage.dependencies, zod: '3.25.77' },
})
expect(base.fingerprint !== dependencyChanged.fingerprint, 'dependency version changes must invalidate the install state')
expect(base.dependencyManifestSha256 !== dependencyChanged.dependencyManifestSha256, 'dependency manifest SHA must change with dependency resolution inputs')

const lockChanged = fingerprint(basePackage, { lockfile: 'lock-v2' })
expect(base.fingerprint !== lockChanged.fingerprint, 'bun.lock changes must invalidate the install state')
expect(base.lockfileSha256 !== lockChanged.lockfileSha256, 'lockfile SHA must expose lockfile changes')

const npmrcChanged = fingerprint(basePackage, { npmrc: 'registry=https://registry.example.invalid/' })
expect(base.fingerprint !== npmrcChanged.fingerprint, '.npmrc changes must invalidate the install state')

const bunChanged = fingerprint(basePackage, { bunVersion: '1.3.15' })
expect(base.fingerprint !== bunChanged.fingerprint, 'Bun version changes must invalidate the install state')

if (failures.length > 0) {
  console.error('[nuxt-feathers-zod] Windows install fingerprint guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Windows install fingerprint is dependency-scoped, canonical and lockfile-aware.')
