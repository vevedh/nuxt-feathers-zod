import { spawn } from 'node:child_process'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveNpmCliPath } from './lib/npm-cli.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDir = resolve(rootDir, 'release-artifacts')
await mkdir(outputDir, { recursive: true })

for (const entry of await readdir(outputDir)) {
  if (/^nuxt-feathers-zod-.*\.tgz$/.test(entry))
    await rm(resolve(outputDir, entry), { force: true })
}

const npmCliPath = resolveNpmCliPath()
const command = npmCliPath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm')
const args = npmCliPath
  ? [npmCliPath, 'pack', '--pack-destination', outputDir]
  : ['pack', '--pack-destination', outputDir]

const child = spawn(command, args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: !npmCliPath && process.platform === 'win32',
})

child.on('error', (error) => {
  console.error(`[nuxt-feathers-zod] Unable to start npm pack: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
