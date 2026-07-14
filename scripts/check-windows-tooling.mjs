import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))
const scripts = pkg.scripts || {}
const buildCli = readFileSync(resolve(rootDir, 'scripts/build-cli.mjs'), 'utf8')
const cleanup = readFileSync(resolve(rootDir, 'scripts/cleanup-safe.mjs'), 'utf8')
const playground = readFileSync(resolve(rootDir, 'playground/nuxt.config.ts'), 'utf8')
const verifyWindows = readFileSync(resolve(rootDir, 'scripts/verify-windows.ps1'), 'utf8')
const runPlayground = readFileSync(resolve(rootDir, 'scripts/run-playground.mjs'), 'utf8')

const failures = []

if (scripts['cli:build'] !== 'bun scripts/build-cli.mjs')
  failures.push('cli:build must run scripts/build-cli.mjs with Bun')

if (!buildCli.includes('globalThis.Bun') || !buildCli.includes('bunRuntime.build({'))
  failures.push('scripts/build-cli.mjs must use the Bun.build() API')

if (/spawn(?:Sync)?\s*\(/.test(buildCli) || buildCli.includes("from 'node:child_process'"))
  failures.push('scripts/build-cli.mjs must not spawn a PATH-dependent Bun child process')

for (const target of [
  "'.output'",
  "'node_modules/.vite'",
  "'playground/.output'",
  "'playground/node_modules/.vite'",
]) {
  if (!cleanup.includes(target))
    failures.push(`cleanup-safe.mjs is missing ${target}`)
}

if (!/optimizeDeps:\s*\{[\s\S]*include:\s*\['socket\.io-client'\]/.test(playground))
  failures.push('playground must pre-bundle socket.io-client')


if (scripts.dev !== 'node scripts/run-playground.mjs dev')
  failures.push('dev must run the project-local Nuxt CLI through Node.js')

if (scripts['playground:dev'] !== 'node scripts/run-playground.mjs dev')
  failures.push('playground:dev must use scripts/run-playground.mjs')

if (scripts['playground:build'] !== 'node scripts/run-playground.mjs build')
  failures.push('playground:build must use scripts/run-playground.mjs')

if (!runPlayground.includes("await import('@nuxt/cli/cli')") || !runPlayground.includes("await import('./ensure-playground-self-link.mjs')"))
  failures.push('run-playground.mjs must load the local Nuxt CLI and ensure the playground link')

if (/spawn(?:Sync)?\s*\(/.test(runPlayground) || runPlayground.includes("node:child_process"))
  failures.push('run-playground.mjs must not spawn a child process')

if (!runPlayground.includes('await writeTypes(nuxt)') || runPlayground.indexOf('await writeTypes(nuxt)') > runPlayground.indexOf('await buildNuxt(nuxt)'))
  failures.push('run-playground.mjs must generate the playground tsconfig before buildNuxt')

if (pkg.engines?.bun !== '>=1.3.6')
  failures.push('engines.bun must require Bun >=1.3.6')

if (scripts['verify:windows'] !== 'powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-windows.ps1')
  failures.push('verify:windows must execute scripts/verify-windows.ps1')

if (!verifyWindows.includes("[version]'1.3.6'") || !verifyWindows.includes("bun upgrade"))
  failures.push('verify-windows.ps1 must reject Bun versions older than 1.3.6 with an upgrade hint')

for (const command of ['install', 'clean:repo', 'typecheck', 'test', 'build']) {
  if (!verifyWindows.includes(`'${command}'`))
    failures.push(`verify-windows.ps1 is missing the ${command} step`)
}

const fresh = String(scripts['dev:fresh'] || '')
const expectedOrder = [
  'bun install --frozen-lockfile',
  'bun run clean:repo',
  'bun run typecheck',
  'node scripts/run-playground.mjs dev',
]
let previousIndex = -1
for (const command of expectedOrder) {
  const index = fresh.indexOf(command)
  if (index <= previousIndex) {
    failures.push(`dev:fresh must contain commands in order; missing or misplaced: ${command}`)
    break
  }
  previousIndex = index
}

if (failures.length) {
  console.error('[nuxt-feathers-zod] Windows tooling guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Windows tooling guard passed.')
