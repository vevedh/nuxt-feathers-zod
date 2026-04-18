import { mkdir, lstat, readlink, realpath, rm, symlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const linkDir = resolve(rootDir, 'playground', 'node_modules', 'nuxt-feathers-zod')
const parentDir = resolve(rootDir, 'playground', 'node_modules')

async function ensureLink() {
  await mkdir(parentDir, { recursive: true })

  let replace = false
  if (existsSync(linkDir)) {
    try {
      const stat = await lstat(linkDir)
      if (stat.isSymbolicLink()) {
        const target = await readlink(linkDir)
        const resolvedTarget = resolve(parentDir, target)
        const currentReal = await realpath(resolvedTarget).catch(() => '')
        const desiredReal = await realpath(rootDir).catch(() => rootDir)
        if (currentReal === desiredReal) {
          console.info(`[nuxt-feathers-zod] playground self-link ok -> ${linkDir}`)
          return
        }
      }
      else {
        const currentReal = await realpath(linkDir).catch(() => '')
        const desiredReal = await realpath(rootDir).catch(() => rootDir)
        if (currentReal == desiredReal) {
          console.info(`[nuxt-feathers-zod] playground self-link ok -> ${linkDir}`)
          return
        }
      }
      replace = true
    }
    catch {
      replace = true
    }
  }

  if (replace) {
    await rm(linkDir, { recursive: true, force: true })
  }

  const target = rootDir
  const type = process.platform === 'win32' ? 'junction' : 'dir'
  await symlink(target, linkDir, type)
  console.info(`[nuxt-feathers-zod] created playground self-link -> ${linkDir}`)
}

await ensureLink()
