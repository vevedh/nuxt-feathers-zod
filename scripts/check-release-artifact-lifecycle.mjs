import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import {
  createArtifactManifest,
  getReleasePaths,
  loadArtifactManifest,
  promoteCandidate,
  recordArtifactValidation,
  requireArtifactValidations,
  resetCandidateWorkspace,
  validateTarball,
  writeJson,
} from './lib/release-artifact.mjs'

function writeOctal(buffer, value, offset, length) {
  const text = value.toString(8).padStart(length - 1, '0') + '\0'
  buffer.write(text, offset, length, 'ascii')
}

function createTarEntry(name, content) {
  const body = Buffer.from(content)
  const header = Buffer.alloc(512)
  header.write(name, 0, 100, 'utf8')
  writeOctal(header, 0o644, 100, 8)
  writeOctal(header, 0, 108, 8)
  writeOctal(header, 0, 116, 8)
  writeOctal(header, body.length, 124, 12)
  writeOctal(header, 0, 136, 12)
  header.fill(0x20, 148, 156)
  header.write('0', 156, 1, 'ascii')
  header.write('ustar\0', 257, 6, 'ascii')
  header.write('00', 263, 2, 'ascii')
  let checksum = 0
  for (const byte of header) checksum += byte
  const checksumText = checksum.toString(8).padStart(6, '0') + '\0 '
  header.write(checksumText, 148, 8, 'ascii')
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512)
  return Buffer.concat([header, body, padding])
}

const fixtureRoot = mkdtempSync(join(tmpdir(), 'nfz-release-artifact-lifecycle-'))
try {
  const packageJson = { name: 'nuxt-feathers-zod', version: '9.9.9' }
  writeFileSync(resolve(fixtureRoot, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
  const paths = resetCandidateWorkspace(fixtureRoot)
  mkdirSync(paths.finalDir, { recursive: true })

  const tar = Buffer.concat([
    createTarEntry('package/package.json', `${JSON.stringify(packageJson)}\n`),
    Buffer.alloc(1024),
  ])
  const tarballPath = resolve(paths.candidateDir, 'nuxt-feathers-zod-9.9.9.tgz')
  writeFileSync(tarballPath, gzipSync(tar))

  const candidate = validateTarball(tarballPath, {
    expectedName: packageJson.name,
    expectedVersion: packageJson.version,
  })
  writeJson(paths.candidateManifest, createArtifactManifest(fixtureRoot, candidate, { state: 'candidate' }))
  const loaded = loadArtifactManifest(fixtureRoot, paths.candidateManifest, { expectedState: 'candidate' })
  recordArtifactValidation(fixtureRoot, 'postgresql', loaded, { fixture: true })
  recordArtifactValidation(fixtureRoot, 'mysql', loaded, { fixture: true })
  recordArtifactValidation(fixtureRoot, 'mariadb', loaded, { fixture: true })
  recordArtifactValidation(fixtureRoot, 'sqlite', loaded, { fixture: true })
  recordArtifactValidation(fixtureRoot, 'mssql', loaded, { fixture: true })
  recordArtifactValidation(fixtureRoot, 'database-matrix', loaded, { fixture: true })
  recordArtifactValidation(fixtureRoot, 'starter', loaded, { fixture: true })
  recordArtifactValidation(fixtureRoot, 'consumer', loaded, { fixture: true })
  const validations = requireArtifactValidations(
    fixtureRoot,
    loaded,
    ['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer'],
  )
  const finalArtifact = promoteCandidate(fixtureRoot, loaded, validations)
  const finalLoaded = loadArtifactManifest(fixtureRoot, getReleasePaths(fixtureRoot).finalManifest, { expectedState: 'final' })

  if (finalArtifact.sha256 !== candidate.sha256 || finalLoaded.sha256 !== candidate.sha256)
    throw new Error('The final artifact hash does not match the validated candidate.')
  if (finalLoaded.manifest.validations.join(',') !== 'postgresql,mysql,mariadb,sqlite,mssql,database-matrix,starter,consumer')
    throw new Error('The final manifest did not preserve exact-artifact validations.')

  console.log(
    '[release] Artifact lifecycle smoke passed: candidate -> postgresql/mysql/mariadb/sqlite/mssql/database-matrix/starter/consumer ' +
      'stamps -> final immutable tarball.',
  )
}
finally {
  rmSync(fixtureRoot, { recursive: true, force: true })
}
