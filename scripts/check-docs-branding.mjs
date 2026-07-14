import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))

const expectedRepository = 'https://github.com/vevedh/nuxt-feathers-zod.git'
const githubUrl = 'https://github.com/vevedh/nuxt-feathers-zod'
const npmUrl = 'https://www.npmjs.com/package/nuxt-feathers-zod'
const brandAsset = resolve(rootDir, 'docs/public/images/nfz-feather.webp')
const faviconAsset = resolve(rootDir, 'docs/public/favicon.png')

const errors = []

if (packageJson.repository?.url !== expectedRepository)
  errors.push(`package.json repository must remain ${expectedRepository}`)

for (const asset of [brandAsset, faviconAsset]) {
  if (!existsSync(asset)) {
    errors.push(`missing documentation asset: ${asset.slice(rootDir.length + 1)}`)
    continue
  }

  if (statSync(asset).size > 160 * 1024)
    errors.push(`documentation asset is unexpectedly large: ${asset.slice(rootDir.length + 1)}`)
}

const config = readFileSync(resolve(rootDir, 'docs/.vitepress/config.mts'), 'utf8')
const brandTitle = readFileSync(resolve(rootDir, 'docs/.vitepress/theme/components/BrandTitle.vue'), 'utf8')
const homeFr = readFileSync(resolve(rootDir, 'docs/index.md'), 'utf8')
const homeEn = readFileSync(resolve(rootDir, 'docs/en/index.md'), 'utf8')

for (const [label, text] of [
  ['VitePress config', config],
  ['French homepage', homeFr],
  ['English homepage', homeEn],
]) {
  if (!text.includes(githubUrl))
    errors.push(`${label} does not expose the GitHub project URL`)
  if (!text.includes(npmUrl))
    errors.push(`${label} does not expose the npm project URL`)
}

if (!config.includes("{ icon: 'github', link: githubProjectUrl"))
  errors.push('VitePress socialLinks must expose the GitHub icon')
if (!config.includes("{ icon: 'npm', link: npmProjectUrl"))
  errors.push('VitePress socialLinks must expose the npm icon')
if (!config.includes("href: '/nuxt-feathers-zod/favicon.png'"))
  errors.push('VitePress must expose the project favicon')
if (!brandTitle.includes("withBase('/images/nfz-feather.webp')"))
  errors.push('The navbar brand must use the restored NFZ feather asset')
if (!homeFr.includes('src: /images/nfz-feather.webp') || !homeEn.includes('src: /images/nfz-feather.webp'))
  errors.push('Both home pages must use the restored NFZ feather in the hero')

const forbiddenDeadAssetRefs = [
  '/images/plume-dark.png',
  '/images/plume-light.png',
  '/images/logo-dark.png',
  '/images/logo-light.png',
]

for (const ref of forbiddenDeadAssetRefs) {
  if (config.includes(ref) || brandTitle.includes(ref) || homeFr.includes(ref) || homeEn.includes(ref))
    errors.push(`dead documentation asset reference detected: ${ref}`)
}

if (errors.length > 0) {
  for (const error of errors)
    console.error(`[nuxt-feathers-zod] docs branding: ${error}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Documentation branding, favicon, npm and GitHub links OK')
