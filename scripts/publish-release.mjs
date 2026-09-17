import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getReleasePaths, loadArtifactManifest } from './lib/release-artifact.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const paths = getReleasePaths(rootDir)
const artifact = loadArtifactManifest(rootDir, paths.finalManifest, { expectedState: 'final' })
const validations = new Set(artifact.manifest.validations || [])
for (const required of ['postgresql', 'mysql', 'mariadb', 'sqlite', 'mssql', 'database-matrix', 'starter', 'consumer']) {
  if (!validations.has(required)) {
    console.error(`[release] Final artifact is missing ${required} validation.`)
    process.exit(1)
  }
}

const dryRun = process.argv.includes('--dry-run')
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const args = ['publish', artifact.tarballPath, '--access', 'public', '--ignore-scripts']
if (dryRun)
  args.push('--dry-run')

console.log(`[release] ${dryRun ? 'Dry-running' : 'Publishing'} exact validated tarball ${artifact.tarballName}.`)
console.log(`[release] SHA-256: ${artifact.sha256}`)

const child = spawn(command, args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('error', (error) => {
  console.error(`[release] Unable to start npm publish: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
