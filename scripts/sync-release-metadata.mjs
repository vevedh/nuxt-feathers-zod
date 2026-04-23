import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const version = String(pkg.version || '').trim()
if (!version) {
  console.error('[nuxt-feathers-zod] Missing package.json version')
  process.exit(1)
}

const targets = [
  'README.md',
  'docs/guide/cli.md',
  'docs/en/guide/cli.md',
  'docs/reference/cli.md',
  'docs/en/reference/cli.md',
]

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
]

for (const file of targets) {
  const abs = resolve(rootDir, file)
  try {
    let text = readFileSync(abs, 'utf8')
    for (const { pattern, replacement } of replacements) {
      text = text.replace(pattern, replacement)
    }
    if (!text.includes(version)) {
      text += `\n\n<!-- release-version: ${version} -->\n`
    }
    writeFileSync(abs, text)
    console.log(`[nuxt-feathers-zod] Synced release metadata in ${file} -> ${version}`)
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[nuxt-feathers-zod] Skipping missing file: ${file}`)
    }
    else {
      throw err
    }
  }
}
