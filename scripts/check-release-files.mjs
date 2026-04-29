import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const targetDir = resolve(process.argv[2] || process.cwd())

const requiredFiles = [
  'README.md',
  'README_fr.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'RELEASE_CHECKLIST.md',
  'REPO_DEV.md',
  'docs/.vitepress/theme/index.ts',
  'docs/.vitepress/theme/style.css',
  'docs/.vitepress/theme/components/BrandTitle.vue',
  'docs/.vitepress/theme/components/BrandTitleAfter.vue',
  'docs/public/images/plume-dark.png',
  'docs/public/images/plume-light.png',
]

let failed = false
for (const file of requiredFiles) {
  const fullPath = resolve(targetDir, file)
  if (!existsSync(fullPath)) {
    console.error(`[nuxt-feathers-zod] Missing required release file: ${file}`)
    failed = true
    continue
  }

  const stat = statSync(fullPath)
  if (!stat.isFile()) {
    console.error(`[nuxt-feathers-zod] Required release path is not a file: ${file}`)
    failed = true
    continue
  }

  if (stat.size <= 0) {
    console.error(`[nuxt-feathers-zod] Required release file is empty: ${file}`)
    failed = true
  }
}

if (failed)
  process.exit(1)

console.log(`[nuxt-feathers-zod] Required release files present in ${targetDir}`)
