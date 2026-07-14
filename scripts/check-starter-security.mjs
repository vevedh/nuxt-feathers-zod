import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const seedPath = path.join(root, 'examples/nfz-quasar-unocss-pinia-starter/server/feathers/modules/seed-users.ts')
const configPath = path.join(root, 'docs/.vitepress/config.mts')
const envPath = path.join(root, 'examples/nfz-quasar-unocss-pinia-starter/.env.example')
const starterSecurityTestPath = path.join(root, 'test/starter-security.spec.ts')

const seed = fs.readFileSync(seedPath, 'utf8')
const vitepress = fs.readFileSync(configPath, 'utf8')
const envExample = fs.readFileSync(envPath, 'utf8')
const starterSecurityTest = fs.readFileSync(starterSecurityTestPath, 'utf8')

const failures = []

function requirePattern(source, pattern, message) {
  if (!pattern.test(source))
    failures.push(message)
}

requirePattern(seed, /return getRuntimeEnvironment\(runtimeConfig\) !== 'production'/, 'Production must disable demo seeding by default.')
requirePattern(seed, /NFZ_DEMO_ENABLED/, 'NFZ_DEMO_ENABLED must be supported.')
requirePattern(seed, /password\.length < 12/, 'Production demo passwords must have a minimum length.')
requirePattern(seed, /UNSAFE_DEMO_PASSWORDS/, 'Known unsafe demo passwords must be rejected.')
requirePattern(seed, /Demo seed disabled for this environment/, 'Disabled production seed must be observable without exposing credentials.')
requirePattern(vitepress, /cleanUrls:\s*false/, 'VitePress cleanUrls must remain disabled for GitHub Pages.')
requirePattern(envExample, /NFZ_DEMO_ENABLED=true/, 'The starter environment example must document explicit demo seed activation.')
requirePattern(starterSecurityTest, /ts\.transpileModule\(/, 'Starter security tests must transpile the real seed source in isolation.')
requirePattern(starterSecurityTest, /mkdtemp\(/, 'Starter security tests must use an isolated temporary module directory.')
requirePattern(starterSecurityTest, /pathToFileURL\(/, 'Starter security tests must import the isolated module by file URL.')

if (/console\.(?:info|warn|error|log)\([^\n]*(?:password|\$\{password\})/i.test(seed))
  failures.push('Seed logs must never include the demo password.')

if (/Seed user (?:created|already exists):\s*\$\{userId\}/.test(seed))
  failures.push('Seed logs must not expose the demo account identifier.')

if (/from\s+['"]\.\.\/examples\/nfz-quasar-unocss-pinia-starter\/server\/feathers\/modules\/seed-users['"]/.test(starterSecurityTest))
  failures.push('Starter security tests must not import the Nuxt example source through Vite before its .nuxt tsconfig exists.')

if (failures.length) {
  console.error('[nuxt-feathers-zod] Starter security guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Starter production defaults and GitHub Pages configuration are safe.')
