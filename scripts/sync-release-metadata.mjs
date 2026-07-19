import {
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const packagePath = resolve(rootDir, 'package.json')
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
const version = String(pkg.version || '').trim()

if (!/^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?$/i.test(version)) {
  console.error(`[nuxt-feathers-zod] Invalid package.json version: ${version || '<missing>'}`)
  process.exit(1)
}

const explicitMarkdownTargets = [
  'README.md',
  'README_fr.md',
  'docs/guide/cli.md',
  'docs/en/guide/cli.md',
  'docs/reference/cli.md',
  'docs/en/reference/cli.md',
]

const firstPartyExamplePackages = [
  'examples/nfz-quasar-unocss-pinia-starter/package.json',
  'examples/nuxt4-keycloak-ldap-spa-ref/package.json',
  'examples/nuxt4-keycloak-ldap-ssr-ref/package.json',
]

const currentExampleTextTargets = [
  'examples/nfz-quasar-unocss-pinia-starter/README.md',
  'examples/nuxt4-keycloak-ldap-spa-ref/.env.example',
  'examples/nuxt4-keycloak-ldap-spa-ref/PROJECT_CONTEXT.md',
  'examples/nuxt4-keycloak-ldap-spa-ref/README.md',
  'examples/nuxt4-keycloak-ldap-spa-ref/app/pages/index.vue',
  'examples/nuxt4-keycloak-ldap-ssr-ref/.env.example',
  'examples/nuxt4-keycloak-ldap-ssr-ref/PROJECT_CONTEXT.md',
  'examples/nuxt4-keycloak-ldap-ssr-ref/README.md',
  'examples/nuxt4-keycloak-ldap-ssr-ref/app/pages/index.vue',
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

function updateTextFile(relativePath, replacements) {
  const absolute = resolve(rootDir, relativePath)
  let text = readFileSync(absolute, 'utf8')
  const original = text

  for (const { pattern, replacement } of replacements)
    text = text.replace(pattern, replacement)

  if (text !== original) {
    writeFileSync(absolute, text)
    console.log(`[nuxt-feathers-zod] Synced release metadata in ${relativePath} -> ${version}`)
  }
}

const markdownTargets = new Set(explicitMarkdownTargets.map(file => resolve(rootDir, file)))
for (const file of collectMarkdownFiles(resolve(rootDir, 'docs')))
  markdownTargets.add(file)

const globalMarkdownReplacements = [
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

for (const absolute of markdownTargets) {
  let text = readFileSync(absolute, 'utf8')
  const original = text

  for (const { pattern, replacement } of globalMarkdownReplacements)
    text = text.replace(pattern, replacement)

  if (text !== original) {
    writeFileSync(absolute, text)
    console.log(`[nuxt-feathers-zod] Synced release metadata in ${absolute.slice(rootDir.length + 1)} -> ${version}`)
  }
}

for (const relativePath of firstPartyExamplePackages) {
  const absolute = resolve(rootDir, relativePath)
  const examplePackage = JSON.parse(readFileSync(absolute, 'utf8'))
  const dependencies = examplePackage.dependencies || {}

  if (!Object.hasOwn(dependencies, 'nuxt-feathers-zod')) {
    console.error(`[nuxt-feathers-zod] Missing nuxt-feathers-zod dependency in ${relativePath}`)
    process.exit(1)
  }

  if (dependencies['nuxt-feathers-zod'] !== version) {
    dependencies['nuxt-feathers-zod'] = version
    examplePackage.dependencies = dependencies
    writeFileSync(absolute, `${JSON.stringify(examplePackage, null, 2)}\n`)
    console.log(`[nuxt-feathers-zod] Synced first-party dependency in ${relativePath} -> ${version}`)
  }
}

for (const relativePath of currentExampleTextTargets) {
  updateTextFile(relativePath, [
    {
      pattern: /\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?/gi,
      replacement: version,
    },
  ])
}


const currentDocumentationReplacements = new Map([
  ['docs/guide/remote-keycloak-app.md', [
    {
      pattern: /NFZ `\d+\.\d+\.\d+` remote direct/g,
      replacement: `NFZ \`${version}\` remote direct`,
    },
  ]],
  ['docs/en/guide/remote-keycloak-app.md', [
    {
      pattern: /direct NFZ `\d+\.\d+\.\d+` remote mode/g,
      replacement: `direct NFZ \`${version}\` remote mode`,
    },
  ]],
  ['docs/guide/remote-keycloak-ldap.md', [
    {
      pattern: /modèle simple recommandé pour NFZ `\d+\.\d+\.\d+`/g,
      replacement: `modèle simple recommandé pour NFZ \`${version}\``,
    },
    {
      pattern: /NFZ `\d+\.\d+\.\d+` remote direct/g,
      replacement: `NFZ \`${version}\` remote direct`,
    },
  ]],
  ['docs/en/guide/remote-keycloak-ldap.md', [
    {
      pattern: /recommended simple model for NFZ `\d+\.\d+\.\d+`/g,
      replacement: `recommended simple model for NFZ \`${version}\``,
    },
    {
      pattern: /direct NFZ `\d+\.\d+\.\d+` remote mode/g,
      replacement: `direct NFZ \`${version}\` remote mode`,
    },
  ]],
  ['docs/guide/remote-keycloak-ldap-ssr.md', [
    {
      pattern: /NFZ `\d+\.\d+\.\d+`/g,
      replacement: `NFZ \`${version}\``,
    },
    {
      pattern: /NFZ \d+\.\d+\.\d+/g,
      replacement: `NFZ ${version}`,
    },
  ]],
  ['docs/en/guide/remote-keycloak-ldap-ssr.md', [
    {
      pattern: /NFZ `\d+\.\d+\.\d+`/g,
      replacement: `NFZ \`${version}\``,
    },
    {
      pattern: /NFZ \d+\.\d+\.\d+/g,
      replacement: `NFZ ${version}`,
    },
  ]],
])

for (const [relativePath, replacements] of currentDocumentationReplacements)
  updateTextFile(relativePath, replacements)

updateTextFile('docs/guide/starter-quasar-unocss-pinia.md', [
  {
    pattern: /La référence fonctionnelle auditée est l’archive :\n\n```txt\n[^\n]+\n```/g,
    replacement: `La référence fonctionnelle auditée pour la release NFZ \`${version}\` est le dossier maintenu dans le dépôt :\n\n\`\`\`txt\nexamples/nfz-quasar-unocss-pinia-starter\n\`\`\``,
  },
  {
    pattern: /La référence fonctionnelle auditée pour la release NFZ `\d+\.\d+\.\d+`/g,
    replacement: `La référence fonctionnelle auditée pour la release NFZ \`${version}\``,
  },
])

updateTextFile('docs/en/guide/starter-quasar-unocss-pinia.md', [
  {
    pattern: /The audited working reference is:\n\n```txt\n[^\n]+\n```/g,
    replacement: `The audited working reference for NFZ release \`${version}\` is the maintained repository directory:\n\n\`\`\`txt\nexamples/nfz-quasar-unocss-pinia-starter\n\`\`\``,
  },
  {
    pattern: /The audited working reference for NFZ release `\d+\.\d+\.\d+`/g,
    replacement: `The audited working reference for NFZ release \`${version}\``,
  },
])
