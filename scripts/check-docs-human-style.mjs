import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const documentationRoots = [
  resolve(rootDir, 'docs'),
]
const explicitFiles = [
  'README.md',
  'README_fr.md',
  'CONTRIBUTING.md',
].map(path => resolve(rootDir, path))
const skippedDirs = new Set(['.git', '.vitepress/cache', '.nuxt', '.output', 'dist', 'node_modules'])
const allowedExtensions = new Set(['.md', '.mdx'])
const discouragedMetaPhrases = [
  /\bdans cette réponse\b/i,
  /\bin this response\b/i,
  /\bcontexte de conversation\b/i,
  /\bconversation context\b/i,
  /\bcomme mentionné précédemment\b/i,
  /\bas mentioned previously\b/i,
  /\bil est important de noter que\b/i,
  /\bit is important to note that\b/i,
  /\ben conclusion,?\b/i,
  /\bin conclusion,?\b/i,
]
const problems = []
const visited = new Set()

function checkFile(file) {
  if (visited.has(file))
    return
  visited.add(file)

  const content = readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const pattern of discouragedMetaPhrases) {
      if (pattern.test(line)) {
        problems.push(`${relative(rootDir, file)}:${index + 1}: ${line.trim()}`)
        break
      }
    }
  })
}

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (skippedDirs.has(name))
      continue
    const full = resolve(directory, name)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full)
      continue
    }
    if (allowedExtensions.has(extname(name).toLowerCase()))
      checkFile(full)
  }
}

for (const directory of documentationRoots)
  walk(directory)
for (const file of explicitFiles)
  checkFile(file)

if (problems.length) {
  console.error('[nuxt-feathers-zod] Documentation editorial style check failed:')
  for (const problem of problems.slice(0, 100))
    console.error(`- ${problem}`)
  if (problems.length > 100)
    console.error(`- ... ${problems.length - 100} additional matches`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Documentation editorial style OK.')
