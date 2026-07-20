import {
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const version = String(pkg.version || '').trim()
const errors = []

if (!/^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?$/i.test(version))
  errors.push(`package.json contains an invalid version: ${version || '<missing>'}`)

function read(relativePath) {
  return readFileSync(resolve(rootDir, relativePath), 'utf8')
}

function expectIncludes(relativePath, needle, description = needle) {
  if (!read(relativePath).includes(needle))
    errors.push(`${relativePath} is missing ${description}`)
}

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

expectIncludes('README.md', `Current reference version: **${version}**.`, 'the canonical English release line')
expectIncludes('README_fr.md', `Version de référence : **${version}**.`, 'the canonical French release line')

if (!read('CHANGELOG.md').startsWith(`## ${version} `))
  errors.push(`CHANGELOG.md must start with the current version ${version}`)


const expectedMarker = `<!-- release-version: ${version} -->`
for (const absolute of collectMarkdownFiles(resolve(rootDir, 'docs'))) {
  const relativePath = absolute.slice(rootDir.length + 1)
  const markers = readFileSync(absolute, 'utf8').match(/<!-- release-version: [^>]+ -->/g) || []

  for (const marker of markers) {
    if (marker !== expectedMarker)
      errors.push(`${relativePath} contains a stale release marker: ${marker}`)
  }
}

const firstPartyExamplePackages = [
  'examples/nfz-quasar-unocss-pinia-starter/package.json',
  'examples/nuxt4-keycloak-ldap-spa-ref/package.json',
  'examples/nuxt4-keycloak-ldap-ssr-ref/package.json',
]

for (const relativePath of firstPartyExamplePackages) {
  const examplePackage = JSON.parse(read(relativePath))
  const dependencyVersion = examplePackage.dependencies?.['nuxt-feathers-zod']

  if (dependencyVersion !== version) {
    errors.push(`${relativePath} depends on nuxt-feathers-zod@${dependencyVersion || '<missing>'}; expected ${version}`)
  }
}

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

for (const relativePath of currentExampleTextTargets) {
  const text = read(relativePath)
  const references = text.match(/\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?/gi) || []

  for (const reference of references) {
    if (reference !== version)
      errors.push(`${relativePath} contains stale current-version reference ${reference}; expected ${version}`)
  }

  if (references.length === 0)
    errors.push(`${relativePath} does not expose the maintained NFZ version ${version}`)
}

expectIncludes(
  'docs/guide/starter-quasar-unocss-pinia.md',
  `release NFZ \`${version}\``,
  'the current French starter release',
)
expectIncludes(
  'docs/en/guide/starter-quasar-unocss-pinia.md',
  `NFZ release \`${version}\``,
  'the current English starter release',
)

const activeDocumentationNeedles = [
  ['docs/guide/remote-keycloak-app.md', `NFZ \`${version}\` remote direct`],
  ['docs/en/guide/remote-keycloak-app.md', `direct NFZ \`${version}\` remote mode`],
  ['docs/guide/remote-keycloak-ldap.md', `modèle simple recommandé pour NFZ \`${version}\``],
  ['docs/en/guide/remote-keycloak-ldap.md', `recommended simple model for NFZ \`${version}\``],
  ['docs/guide/remote-keycloak-ldap-ssr.md', `NFZ ${version} = client Feathers remote direct`],
  ['docs/en/guide/remote-keycloak-ldap-ssr.md', `NFZ ${version} = direct remote Feathers client`],
]

for (const [relativePath, needle] of activeDocumentationNeedles)
  expectIncludes(relativePath, needle, `the maintained version reference ${version}`)

if (errors.length > 0) {
  console.error('[nuxt-feathers-zod] Version coherence check failed:')
  for (const error of errors)
    console.error(`- ${error}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] Version coherence aligned on ${version}`)
