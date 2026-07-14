import { mkdir, readdir, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDir = resolve(rootDir, 'release-artifacts')
await mkdir(outputDir, { recursive: true })

for (const entry of await readdir(outputDir)) {
  if (/^nuxt-feathers-zod-.*\.tgz$/.test(entry))
    await rm(resolve(outputDir, entry), { force: true })
}

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const child = spawn(command, ['pack', '--pack-destination', outputDir], {
  cwd: rootDir,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(`[nuxt-feathers-zod] Unable to start npm pack: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
