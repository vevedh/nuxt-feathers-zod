import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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
  ['README_fr.md', [version]],
  ['docs/guide/cli.md', [version]],
  ['docs/en/guide/cli.md', [version]],
  ['docs/reference/cli.md', [version]],
  ['docs/en/reference/cli.md', [version]],
]

function collectMarkdownFiles(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    if (['node_modules', '.vitepress', '.cache', 'dist'].includes(entry))
      continue

    const absolute = resolve(directory, entry)
    const stat = statSync(absolute)
    if (stat.isDirectory())
      files.push(...collectMarkdownFiles(absolute))
    else if (entry.endsWith('.md'))
      files.push(absolute)
  }
  return files
}

let failed = false
for (const [file, needles] of checks) {
  const text = readFileSync(resolve(rootDir, file), 'utf8')
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`[nuxt-feathers-zod] Release metadata mismatch: ${file} does not mention ${needle}. Run: bun run sync:release-meta`)
      failed = true
    }
  }
}

const builtModulePath = resolve(rootDir, 'dist/module.json')
if (existsSync(builtModulePath)) {
  const builtModule = JSON.parse(readFileSync(builtModulePath, 'utf8'))
  if (builtModule.version !== version) {
    console.error(`[nuxt-feathers-zod] Built module metadata mismatch: dist/module.json=${builtModule.version}, package.json=${version}`)
    failed = true
  }
}

const expectedMarker = `<!-- release-version: ${version} -->`
for (const absolute of collectMarkdownFiles(resolve(rootDir, 'docs'))) {
  const text = readFileSync(absolute, 'utf8')
  const markers = text.match(/<!-- release-version: [^>]+ -->/g) || []
  for (const marker of markers) {
    if (marker !== expectedMarker) {
      console.error(`[nuxt-feathers-zod] Stale release marker in ${absolute.slice(rootDir.length + 1)}: ${marker}`)
      failed = true
    }
  }
}

if (failed)
  process.exit(1)
console.log(`[nuxt-feathers-zod] Release metadata aligned on ${version}`)
