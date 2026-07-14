import { readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const version = String(pkg.version || '').trim()
const suppliedTag = process.argv[2] || process.env.GITHUB_REF_NAME || ''
const expectedTag = `v${version}`

if (!suppliedTag) {
  console.error('[nuxt-feathers-zod] Missing release tag. Pass vX.Y.Z or set GITHUB_REF_NAME.')
  process.exit(1)
}

if (suppliedTag !== expectedTag) {
  console.error(`[nuxt-feathers-zod] Tag/version mismatch: received ${suppliedTag}, expected ${expectedTag}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] Release tag matches package version: ${expectedTag}`)
