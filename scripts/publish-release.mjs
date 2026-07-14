import { access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const packageJson = await import(new URL('../package.json', import.meta.url), {
  with: { type: 'json' },
})

const { name, version } = packageJson.default
if (name !== 'nuxt-feathers-zod' || typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('[nuxt-feathers-zod] Invalid package identity or version.')
  process.exit(1)
}

const tarballName = `${name}-${version}.tgz`
const tarballPath = resolve(rootDir, 'release-artifacts', tarballName)

try {
  await access(tarballPath)
}
catch {
  console.error(`[nuxt-feathers-zod] Release tarball is missing: ${tarballPath}`)
  console.error('[nuxt-feathers-zod] Run "bun run release:pack" first.')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const args = ['publish', tarballPath, '--access', 'public']
if (dryRun)
  args.push('--dry-run')

console.log(`[nuxt-feathers-zod] ${dryRun ? 'Dry-running' : 'Publishing'} exact tarball ${tarballName}.`)

const child = spawn(command, args, {
  cwd: rootDir,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(`[nuxt-feathers-zod] Unable to start npm publish: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
