import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const forbidden = [
  '.env',
  'tmp-check.mjs',
  'PATCH_NOTES.txt',
  'gitignore',
  'npmrc',
  'github',
  'vscode',
]
const found = forbidden.filter(path => existsSync(resolve(rootDir, path)))

if (found.length) {
  console.error('[nuxt-feathers-zod] Source archive hygiene check failed:')
  for (const path of found)
    console.error(`- remove ${path}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Source archive hygiene OK.')
