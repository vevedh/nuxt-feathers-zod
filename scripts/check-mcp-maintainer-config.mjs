import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const failures = []
const configPath = resolve(root, '.vscode/mcp.json')
const agentsPath = resolve(root, 'AGENTS.md')
const privateDocPath = resolve(root, 'docs-private/maintenance/mcp-nuxt-feathers.md')
const gitIgnore = readFileSync(resolve(root, '.gitignore'), 'utf8')
const privateMaintenancePresent = [configPath, agentsPath, privateDocPath].some(path => existsSync(path))

if (!privateMaintenancePresent) {
  console.log('[nuxt-feathers-zod] Private MCP maintainer configuration is absent in this public checkout; check skipped.')
  process.exit(0)
}

if (!existsSync(configPath)) {
  failures.push('missing private .vscode/mcp.json maintainer configuration')
}
else {
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  const nuxt = config?.servers?.nuxt
  const feathers = config?.servers?.feathersjs
  if (nuxt?.type !== 'http' || nuxt?.url !== 'https://nuxt.com/mcp')
    failures.push('Nuxt MCP must use the official HTTPS endpoint')
  if (feathers?.type !== 'stdio' || feathers?.command !== 'npx')
    failures.push('FeathersJS MCP must use the documented npx stdio launcher')
  const packageArgument = Array.isArray(feathers?.args)
    ? feathers.args.find(argument => String(argument).startsWith('feathersjs-mcp@'))
    : undefined
  if (!packageArgument || packageArgument.endsWith('@latest'))
    failures.push('FeathersJS MCP must be pinned to an explicit version')
}

const agents = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : ''
for (const required of [
  'Nuxt 4 module and Feathers architecture contract',
  'NFZ-first server architecture',
  'Feathers service structure adapted to Nuxt 4',
  'MCP documentation sources',
]) {
  if (!agents.includes(required))
    failures.push(`AGENTS.md is missing ${required}`)
}

if (!gitIgnore.includes('.vscode/*'))
  failures.push('.vscode/mcp.json must remain ignored by Git')
if (!existsSync(privateDocPath))
  failures.push('missing private MCP maintenance documentation')

if (failures.length) {
  console.error('[nuxt-feathers-zod] MCP maintainer configuration guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Nuxt and FeathersJS MCP maintainer configuration is aligned.')
