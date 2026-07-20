import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, relative, resolve } from 'node:path'

const root = resolve(process.cwd())
const publicDocs = resolve(root, 'docs')
const privateDocs = resolve(root, 'docs-private')
const requirePrivate = process.argv.includes('--require-private') || process.env.NFZ_PRIVATE_DOCS_REQUIRED === '1'
const errors = []

const gitignore = readFileSync(resolve(root, '.gitignore'), 'utf8')
for (const pattern of ['patch-memory/', 'docs-private/', 'AGENTS.md', 'PATCHLOG.md', 'PRODUCTION_AUDIT.md', 'REPO_DEV.md', 'RELEASE_CHECKLIST.md', 'TODO.md']) {
  if (!gitignore.split(/\r?\n/).includes(pattern))
    errors.push(`.gitignore must contain ${pattern}`)
}

const forbiddenPublicFiles = new Set([
  'repo-dev.md',
  'release-checklist.md',
  'publishing.md',
  'dependency-maintenance.md',
  'developer-playwright-testing.md',
  'community-workflow.md',
  'product-demos.md',
  'smoke-scenarios.md',
  'open-core.md',
  'open-core-vs-pro.md',
])
const forbiddenPublicText = [
  'patch-memory',
  'docs-private',
  'AGENTS.md',
  'release:pack',
  'release:check:full',
  'repo:clean-maintenance-index',
]

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.vitepress'].includes(name))
      continue
    const full = resolve(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

for (const file of walk(publicDocs)) {
  const rel = relative(root, file).replace(/\\/g, '/')
  if (forbiddenPublicFiles.has(basename(file)))
    errors.push(`${rel} is maintainer-only and must live in docs-private`)
  if (!/\.(?:md|mts|ts|vue)$/i.test(file))
    continue
  const text = readFileSync(file, 'utf8')
  for (const needle of forbiddenPublicText) {
    if (text.includes(needle))
      errors.push(`${rel} exposes private maintenance content: ${needle}`)
  }
}


function resolvePrivateLink(sourceFile, rawLink) {
  const link = rawLink.split('#')[0].split('?')[0]
  if (!link || /^(?:https?:|mailto:|tel:)/i.test(link))
    return null

  if (link.startsWith('/images/'))
    return [resolve(privateDocs, 'public', link.slice(1))]

  const base = link.startsWith('/')
    ? resolve(privateDocs, link.slice(1))
    : resolve(sourceFile, '..', link)

  const candidates = [base]
  if (!['.md', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.json'].includes(extname(base).toLowerCase())) {
    candidates.push(`${base}.md`)
    candidates.push(resolve(base, 'index.md'))
  }
  return candidates
}

function checkPrivateLinks() {
  if (!existsSync(privateDocs))
    return

  for (const file of walk(privateDocs).filter(path => path.endsWith('.md'))) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const candidates = resolvePrivateLink(file, match[1])
      if (candidates && !candidates.some(existsSync))
        errors.push(`${relative(root, file)} contains a dead private link: ${match[1]}`)
    }
  }
}

checkPrivateLinks()

if (requirePrivate && !existsSync(privateDocs))
  errors.push('docs-private is required for this local patch validation')

if (existsSync(privateDocs)) {
  for (const required of [
    'index.md',
    'package.json',
    '.vitepress/config.mts',
    'workflow/agents-rules.md',
    'evolution/roadmap.md',
    'evolution/patches/index.md',
  ]) {
    if (!existsSync(resolve(privateDocs, required)))
      errors.push(`docs-private is missing ${required}`)
  }
}

if (errors.length) {
  console.error('[nuxt-feathers-zod] Documentation boundary check failed:')
  for (const error of [...new Set(errors)]) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] Public/private documentation boundary OK${existsSync(privateDocs) ? ' with local private docs' : ''}.`)
