import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const docsRoot = join(root, 'docs')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    const st = statSync(abs)
    if (st.isDirectory()) walk(abs, out)
    else if (st.isFile() && name.endsWith('.md')) out.push(abs)
  }
  return out
}

function findMisplacedYamlFence(src) {
  if (src.startsWith('---\n')) return -1
  const lines = src.split(/\r?\n/)
  const start = lines.findIndex(line => line.trim() === '---')
  if (start <= 0) return -1
  const end = lines.findIndex((line, index) => index > start && line.trim() === '---')
  if (end === -1) return -1
  const yamlCandidate = lines.slice(start + 1, end)
  return yamlCandidate.some(line => /^[A-Za-z0-9_-]+:\s/.test(line)) ? start + 1 : -1
}

function checkFrontmatter(absPath) {
  const src = readFileSync(absPath, 'utf8').replace(/^\uFEFF/, '')
  const misplaced = findMisplacedYamlFence(src)
  if (misplaced !== -1) {
    return [`${relative(root, absPath)}:${misplaced}: YAML front matter must start at line 1`]
  }

  if (!src.startsWith('---\n')) return []
  const end = src.indexOf('\n---\n', 4)
  if (end === -1) return [`${relative(root, absPath)}: unterminated YAML front matter`]
  const frontmatter = src.slice(4, end)
  const errors = []

  for (const [i, line] of frontmatter.split(/\r?\n/).entries()) {
    const n = i + 1
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (/^[A-Za-z0-9_-]+:(\S)/.test(line)) {
      errors.push(`${relative(root, absPath)}:${n}: YAML key must use ": " with a space after the colon`)
    }
    if (/\t/.test(line)) {
      errors.push(`${relative(root, absPath)}:${n}: tab characters are not allowed in YAML front matter`)
    }
  }

  return errors
}

const files = walk(docsRoot)
const errors = files.flatMap(checkFrontmatter)

if (errors.length) {
  console.error('[nuxt-feathers-zod] Docs front matter errors detected:')
  for (const err of errors) console.error(`- ${err}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] Docs front matter OK (${files.length} markdown files checked)`)
