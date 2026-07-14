import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const version = String(pkg.version || '').trim()
if (!version) {
  console.error('[nuxt-feathers-zod] Missing package.json version')
  process.exit(1)
}

const explicitTargets = [
  'README.md',
  'README_fr.md',
  'docs/guide/cli.md',
  'docs/en/guide/cli.md',
  'docs/reference/cli.md',
  'docs/en/reference/cli.md',
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

const targets = new Set(explicitTargets.map(file => resolve(rootDir, file)))
for (const file of collectMarkdownFiles(resolve(rootDir, 'docs')))
  targets.add(file)

const replacements = [
  {
    pattern: /> OSS reference snapshot: \*\*v[\d.]+\*\*/g,
    replacement: `> OSS reference snapshot: **v${version}**`,
  },
  {
    pattern: /Current OSS release target: \*\*[\d.]+\*\*\./g,
    replacement: `Current OSS release target: **${version}**.`,
  },
  {
    pattern: /Current reference version: \*\*[\d.]+\*\*\./g,
    replacement: `Current reference version: **${version}**.`,
  },
  {
    pattern: /Version de référence\s*: \*\*[\d.]+\*\*\./g,
    replacement: `Version de référence : **${version}**.`,
  },
  {
    pattern: /## CLI command surface in [\d.]+/g,
    replacement: `## CLI command surface in ${version}`,
  },
  {
    pattern: /# CLI Reference — OSS [\d.]+/g,
    replacement: `# CLI Reference — OSS ${version}`,
  },
  {
    pattern: /release \*\*[\d.]+\*\*/g,
    replacement: `release **${version}**`,
  },
  {
    pattern: /<!-- release-version: [^>]+ -->/g,
    replacement: `<!-- release-version: ${version} -->`,
  },
]

for (const absolute of targets) {
  let text = readFileSync(absolute, 'utf8')
  const original = text
  for (const { pattern, replacement } of replacements)
    text = text.replace(pattern, replacement)

  if (text !== original) {
    writeFileSync(absolute, text)
    console.log(`[nuxt-feathers-zod] Synced release metadata in ${absolute.slice(rootDir.length + 1)} -> ${version}`)
  }
}
