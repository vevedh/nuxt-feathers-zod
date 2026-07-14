import { existsSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = resolve(process.cwd())
const cliDir = resolve(rootDir, 'dist/cli')
const entry = resolve(cliDir, 'index.mjs')
const maxEntryBytes = Number(process.env.NFZ_CLI_ENTRY_BUDGET || 180_000)
const maxTotalBytes = Number(process.env.NFZ_CLI_TOTAL_BUDGET || 900_000)

if (!existsSync(entry)) {
  console.error('[nuxt-feathers-zod] CLI entry is missing. Run `bun run cli:build` first.')
  process.exit(1)
}

function collectFiles(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory())
      files.push(...collectFiles(full))
    else if (name.endsWith('.mjs'))
      files.push(full)
  }
  return files
}

const entryBytes = statSync(entry).size
const files = collectFiles(cliDir)
const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0)

if (entryBytes > maxEntryBytes || totalBytes > maxTotalBytes) {
  console.error('[nuxt-feathers-zod] CLI bundle budget exceeded:')
  console.error(`- entry: ${entryBytes} bytes / ${maxEntryBytes}`)
  console.error(`- total: ${totalBytes} bytes / ${maxTotalBytes}`)
  process.exit(1)
}

console.log(`[nuxt-feathers-zod] CLI bundle budget OK: entry=${entryBytes} bytes total=${totalBytes} bytes chunks=${files.length - 1}`)
