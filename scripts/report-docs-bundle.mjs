import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const requested = process.argv.slice(2)
const workspaces = requested.length ? requested : ['docs', 'docs-private']
const softLimit = Number.parseInt(process.env.NFZ_DOCS_BUNDLE_SOFT_BYTES || String(500 * 1024), 10)
const hardLimit = Number.parseInt(process.env.NFZ_DOCS_BUNDLE_MAX_BYTES || '0', 10)

if (!Number.isInteger(softLimit) || softLimit <= 0)
  throw new Error('NFZ_DOCS_BUNDLE_SOFT_BYTES must be a positive integer.')
if (!Number.isInteger(hardLimit) || hardLimit < 0)
  throw new Error('NFZ_DOCS_BUNDLE_MAX_BYTES must be zero or a positive integer.')

function collectFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name)
    if (entry.isDirectory())
      collectFiles(absolute, files)
    else
      files.push(absolute)
  }
  return files
}

let failed = false
for (const workspaceName of workspaces) {
  if (!['docs', 'docs-private'].includes(workspaceName))
    throw new Error(`Unsupported documentation workspace: ${workspaceName}`)

  const dist = resolve(root, workspaceName, '.vitepress', 'dist')
  if (!existsSync(dist)) {
    console.log(`[docs-bundle] ${workspaceName}: build output missing; run its VitePress build first.`)
    continue
  }

  const assets = collectFiles(dist)
    .filter(file => ['.js', '.css'].includes(extname(file)))
    .map(file => ({ file, bytes: statSync(file).size }))
    .sort((a, b) => b.bytes - a.bytes)

  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0)
  const oversized = assets.filter(asset => asset.bytes > softLimit)
  const top = assets.slice(0, 8)

  console.log(`[docs-bundle] ${workspaceName}: ${assets.length} JS/CSS assets, total=${totalBytes} bytes, soft=${softLimit} bytes${hardLimit ? `, hard=${hardLimit} bytes` : ''}.`)
  for (const asset of top) {
    const marker = asset.bytes > softLimit ? ' oversized' : ''
    console.log(`[docs-bundle] ${workspaceName}: ${asset.bytes} bytes${marker} ${relative(dist, asset.file).replaceAll('\\\\', '/')}`)
  }

  if (oversized.length) {
    console.warn(`[docs-bundle] ${workspaceName}: ${oversized.length} asset(s) exceed the soft budget; this is measured debt, not a suppressed Vite warning.`)
  }

  if (hardLimit > 0) {
    const breaches = assets.filter(asset => asset.bytes > hardLimit)
    if (breaches.length) {
      failed = true
      for (const asset of breaches)
        console.error(`[docs-bundle] ${workspaceName}: hard budget exceeded by ${basename(asset.file)} (${asset.bytes} > ${hardLimit}).`)
    }
  }
}

if (failed)
  process.exit(1)
