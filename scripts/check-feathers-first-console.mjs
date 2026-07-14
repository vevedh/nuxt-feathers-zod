import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(process.cwd())
const problems = []

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function listFiles(dir) {
  const result = []
  for (const entry of readdirSync(resolve(root, dir))) {
    const full = resolve(root, dir, entry)
    if (statSync(full).isDirectory())
      result.push(...listFiles(relative(root, full)))
    else if (full.endsWith('.ts'))
      result.push(relative(root, full).replaceAll('\\', '/'))
  }
  return result
}

const builderClient = read('src/runtime/composables/useBuilderClient.ts')
if (!builderClient.includes('.service('))
  problems.push('useBuilderClient() must resolve Builder operations through the Feathers client.')
if (/\$fetch|useAuthBoundFetch|\/api\/nfz\//.test(builderClient))
  problems.push('useBuilderClient() must not call Nitro Builder routes or HTTP fetch helpers.')

const capabilities = read('src/runtime/capabilities.ts')
const consoleServices = read('src/runtime/server/console-services.ts')
for (const servicePath of [
  'nfz/services',
  'nfz/schemas',
  'nfz/manifest',
  'nfz/builder',
  'nfz/status',
  'nfz/rbac',
  'nfz/presets',
  'nfz/init',
]) {
  if (!capabilities.includes(`'${servicePath}'`))
    problems.push(`Missing canonical Feathers service path from capabilities: ${servicePath}`)
}
if (!consoleServices.includes("import { NFZ_CONSOLE_SERVICE_PATHS } from '../capabilities'"))
  problems.push('Console services must consume the canonical capability path registry.')
if (!consoleServices.includes('registerNfzConsoleServices'))
  problems.push('The canonical NFZ service registrar is missing.')

const pluginTemplate = read('src/runtime/templates/server/plugin.ts')
if (!pluginTemplate.includes('registerNfzConsoleServices'))
  problems.push('The generated server plugin must register canonical NFZ services before app.setup().')

const apiFiles = listFiles('src/runtime/server/api/nfz')
for (const file of apiFiles) {
  const source = read(file)
  if (!source.includes('callNfzConsoleService'))
    problems.push(`${file} does not delegate to the Feathers compatibility bridge.`)
  if (/nfzSchema|rbacFile|core\/presets|server\/presets|writeFileSync|spawn\(/.test(source))
    problems.push(`${file} contains domain logic instead of delegating to Feathers.`)
  const meaningfulLines = source.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('//')).length
  if (meaningfulLines > 24)
    problems.push(`${file} is too large for a compatibility facade (${meaningfulLines} meaningful lines).`)
}

const consoleLayer = read('src/setup/apply-console-layer.ts')
if (!consoleLayer.includes('legacyNitroRoutes === false'))
  problems.push('Deprecated Nitro routes must be optional through console.legacyNitroRoutes.')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Feathers-first console check failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] Feathers-first console boundaries OK (${apiFiles.length} deprecated Nitro facades checked).`)
