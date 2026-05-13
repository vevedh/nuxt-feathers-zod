import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const rootDir = process.cwd()
const scanDirs = ['docs', 'README.md', 'README_fr.md']

const conflictPatterns = [
  { name: 'git conflict start marker', pattern: /^<<<<<<<(?:\s|$)/ },
  { name: 'git conflict separator marker', pattern: /^=======$/ },
  { name: 'git conflict end marker', pattern: /^>>>>>>>(?:\s|$)/ },
  // VitePress treats code fences/snippets beginning with <<< as file imports.
  // A truncated merge marker such as ````<<<< HEAD` fails at build time with ENOENT.
  { name: 'truncated conflict marker interpreted as a VitePress snippet', pattern: /^<{4,}\s*HEAD\b/ },
]

const textExtensions = new Set(['.md', '.mdx', '.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue', '.json', '.yml', '.yaml'])
const errors = []

function hasTextExtension(filePath) {
  return [...textExtensions].some(ext => filePath.endsWith(ext))
}

function scanFile(filePath) {
  if (!hasTextExtension(filePath)) return

  const content = readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)

  for (const [index, line] of lines.entries()) {
    for (const { name, pattern } of conflictPatterns) {
      if (pattern.test(line.trim())) {
        errors.push({
          file: relative(rootDir, filePath),
          line: index + 1,
          name,
          value: line,
        })
      }
    }
  }
}

function scanEntry(entry) {
  const path = join(rootDir, entry)
  const stats = statSync(path)

  if (stats.isDirectory()) {
    const walk = dir => {
      for (const child of readdirSync(dir)) {
        if (child === 'node_modules' || child === '.vitepress/cache' || child === '.vitepress/dist') continue
        const childPath = join(dir, child)
        const childStats = statSync(childPath)
        if (childStats.isDirectory()) walk(childPath)
        else scanFile(childPath)
      }
    }
    walk(path)
  }
  else {
    scanFile(path)
  }
}

for (const entry of scanDirs) {
  scanEntry(entry)
}

if (errors.length > 0) {
  console.error('[nuxt-feathers-zod] Documentation conflict markers detected:')
  for (const error of errors) {
    console.error(`- ${error.file}:${error.line} (${error.name}) -> ${error.value}`)
  }
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Docs conflict marker check OK')
