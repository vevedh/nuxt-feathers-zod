import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const targetDir = resolve(process.argv[2] || process.cwd())

const requiredFiles = [
  'README.md',
  'README_fr.md',
  'PATCHLOG.md',
  'PROMPT_CONTEXT.md',
  'JOURNAL.md',
  'AI_CONTEXT/PROJECT_CONTEXT.md',
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

  const text = readFileSync(fullPath, 'utf8').trim()
  if (!text) {
    console.error(`[nuxt-feathers-zod] Required release file is empty: ${file}`)
    failed = true
  }
}

if (failed)
  process.exit(1)

console.log(`[nuxt-feathers-zod] Required release files present in ${targetDir}`)
