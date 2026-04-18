import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve(process.cwd(), 'src/cli/core.ts')
const source = readFileSync(file, 'utf8')

const required = [
  { label: 'escaped windows slash normalization', fragment: ".replace(/\\\\/g, '/')" },
  { label: 'escaped .bin nested template', fragment: 'return join(root, \\`\\${id}.bin\\`)' },
  { label: 'escaped .json nested template', fragment: 'return join(root, \\`\\${id}.json\\`)' },
  { label: 'storage dir fallback uses service kebab name', fragment: 'String(opts.storageDir || `storage/${serviceNameKebab}`).trim()' },
  { label: 'upload helper attached in shared template', fragment: 'function attach_upload(remote: any)' },
  { label: 'download helper attached in shared template', fragment: 'function attach_download(remote: any)' },
]

const forbidden = [
  { label: 'broken windows slash normalization', fragment: ".replace(/\\/g, '/')" },
  { label: 'unescaped .bin nested template', fragment: 'return join(root, `${id}.bin`)' },
  { label: 'unescaped .json nested template', fragment: 'return join(root, `${id}.json`)' },
]

const missing = required.filter(item => !source.includes(item.fragment)).map(item => item.label)
const foundForbidden = forbidden.filter(item => source.includes(item.fragment)).map(item => item.label)

if (missing.length || foundForbidden.length) {
  console.error('[nuxt-feathers-zod] file-service template safety check failed')
  if (missing.length) {
    console.error('Missing required template fragments:')
    for (const item of missing) console.error(`- ${item}`)
  }
  if (foundForbidden.length) {
    console.error('Found forbidden template fragments:')
    for (const item of foundForbidden) console.error(`- ${item}`)
  }
  process.exit(1)
}

console.log('[nuxt-feathers-zod] file-service template safety OK')
