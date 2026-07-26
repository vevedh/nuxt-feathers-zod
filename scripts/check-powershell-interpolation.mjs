import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const roots = ['scripts', '.github']
const allowedScopes = new Set([
  'env',
  'function',
  'global',
  'local',
  'private',
  'script',
  'using',
  'variable',
])
const failures = []

function walk(directory) {
  const absoluteDirectory = resolve(rootDir, directory)

  for (const entry of readdirSync(absoluteDirectory)) {
    const absolute = resolve(absoluteDirectory, entry)
    const relative = absolute.slice(rootDir.length + 1).replaceAll('\\', '/')
    const stat = statSync(absolute)

    if (stat.isDirectory()) {
      walk(relative)
      continue
    }

    if (!entry.endsWith('.ps1'))
      continue

    const lines = readFileSync(absolute, 'utf8').split(/\r?\n/)
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*):/g)) {
        const variable = match[1]
        if (allowedScopes.has(variable.toLowerCase()))
          continue

        failures.push(
          `${relative}:${index + 1} contains ambiguous PowerShell interpolation $${variable}:; use \${${variable}} or the -f format operator`,
        )
      }
    })
  }
}

for (const root of roots)
  walk(root)

if (failures.length > 0) {
  console.error('[nuxt-feathers-zod] PowerShell interpolation check failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] PowerShell interpolation safety OK')
