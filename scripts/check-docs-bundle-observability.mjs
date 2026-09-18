import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const runner = readFileSync(resolve(root, 'scripts/run-docs-build.mjs'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const privateConfigPath = resolve(root, 'docs-private/.vitepress/config.mts')
const privateConfig = existsSync(privateConfigPath) ? readFileSync(privateConfigPath, 'utf8') : null
const publicConfig = readFileSync(resolve(root, 'docs/.vitepress/config.mts'), 'utf8')
const problems = []

if (!runner.includes("report-docs-bundle.mjs"))
  problems.push('run-docs-build.mjs must report bundle ownership after a successful VitePress build')
if (packageJson.scripts?.['docs:bundle:report'] !== 'node scripts/report-docs-bundle.mjs docs docs-private')
  problems.push('docs:bundle:report package script is missing or drifted')
if ((privateConfig && /chunkSizeWarningLimit/.test(privateConfig)) || /chunkSizeWarningLimit/.test(publicConfig))
  problems.push('VitePress chunk warnings must not be hidden with chunkSizeWarningLimit; measure them instead')
if (/NODE_NO_WARNINGS|--no-deprecation|--disable-warning/.test(JSON.stringify(packageJson.scripts || {})))
  problems.push('package scripts must not suppress Node deprecation warnings')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Documentation bundle observability policy failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

if (!privateConfig)
  console.log('[nuxt-feathers-zod] Private documentation is absent; validating bundle observability against the public documentation checkout only.')

console.log('[nuxt-feathers-zod] Documentation bundle debt is measured after builds and Vite/Node warnings remain visible.')
