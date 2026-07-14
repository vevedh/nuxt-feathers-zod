import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(process.cwd())
const docsRoot = resolve(root, 'docs')
const problems = []

function walk(dir) {
  const result = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'cache' || name === '.temp')
      continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory())
      result.push(...walk(full))
    else if (extname(full) === '.md')
      result.push(full)
  }
  return result
}

function normalizeTarget(raw) {
  const value = raw.trim().replace(/^<|>$/g, '')
  if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:)/i.test(value))
    return null

  const path = value.split('#', 1)[0].split('?', 1)[0]
  if (!path || /\.(?:png|jpe?g|webp|svg|gif|ico|zip|tgz|json)$/i.test(path))
    return null

  return path
}

function candidates(sourceFile, target) {
  if (target.startsWith('/')) {
    const clean = target.replace(/^\/+/, '').replace(/\/+$/, '')
    const base = resolve(docsRoot, clean)
    return clean
      ? [`${base}.md`, join(base, 'index.md')]
      : [join(docsRoot, 'index.md')]
  }

  const base = resolve(sourceFile, '..', target)
  return target.endsWith('/')
    ? [join(base, 'index.md')]
    : [base, `${base}.md`, join(base, 'index.md')]
}

for (const file of walk(docsRoot)) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = normalizeTarget(match[1])
    if (!target)
      continue
    if (!candidates(file, target).some(existsSync))
      problems.push(`${relative(root, file)} -> ${target}`)
  }
}

const vitepressConfig = resolve(docsRoot, '.vitepress/config.mts')
if (existsSync(vitepressConfig)) {
  const source = readFileSync(vitepressConfig, 'utf8')
  for (const match of source.matchAll(/\blink:\s*['"](\/[^'"]+)['"]/g)) {
    const target = normalizeTarget(match[1])
    if (!target)
      continue
    if (!candidates(vitepressConfig, target).some(existsSync))
      problems.push(`docs/.vitepress/config.mts -> ${target}`)
  }
}

if (problems.length) {
  console.error('[nuxt-feathers-zod] Documentation link check failed:')
  for (const problem of [...new Set(problems)].sort())
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Documentation internal links resolve to existing pages.')
