import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const version = String(pkg.version || '').trim()
if (!version) {
  console.error('[nuxt-feathers-zod] Missing package.json version')
  process.exit(1)
}

const checks = [
  ['README.md', [version]],
  ['docs/guide/cli.md', [version]],
  ['docs/en/guide/cli.md', [version]],
  ['docs/reference/cli.md', [version]],
  ['docs/en/reference/cli.md', [version]],
  ['AI_CONTEXT/CLI_REFERENCE.md', [version]],
]

let failed = false
for (const [file, needles] of checks) {
  const text = readFileSync(resolve(rootDir, file), 'utf8')
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`[nuxt-feathers-zod] Release metadata mismatch: ${file} does not mention ${needle}`)
      failed = true
    }
  }
}

if (failed)
  process.exit(1)
console.log(`[nuxt-feathers-zod] Release metadata aligned on ${version}`)
