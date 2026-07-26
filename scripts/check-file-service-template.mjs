import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve(process.cwd(), 'src/cli/core.ts')
const source = readFileSync(file, 'utf8')

const required = [
  { label: 'escaped windows slash normalization', fragment: ".replace(/\\\\/g, '/')" },
  { label: 'leading dot filename cleanup', fragment: "replace(/^[.-]+|[.-]+$/g, '')" },
  { label: 'UUID validation in generated schema', fragment: 'id: z.string().uuid()' },
  { label: 'confined binary path helper', fragment: "return this.safePath(root, id, '.bin')" },
  { label: 'confined metadata path helper', fragment: "return this.safePath(root, id, '.json')" },
  { label: 'storage confinement check', fragment: "relativePath.startsWith('..') || isAbsolute(relativePath)" },
  { label: 'pre-decode Base64 length limit', fragment: 'encoded.length > maxEncodedLength' },
  { label: 'canonical Base64 validation', fragment: "buffer.toString('base64') !== encoded" },
  { label: 'storage dir fallback uses service kebab name', fragment: 'String(opts.storageDir || `storage/${serviceNameKebab}`).trim()' },
  { label: 'documented plural service config key base', fragment: 'const serviceConfigCamel = camelCase(serviceNameKebab)' },
  { label: 'generated maxBytes reads the service name before the legacy singular key', fragment: "this.app.get('${serviceConfigBase}MaxBytes')${legacyMaxBytesFallback}" },
  { label: 'generated storage reads the service name before the legacy singular key', fragment: "this.app.get('${serviceConfigBase}StorageDir')${legacyStorageFallback}" },
  { label: 'generated MIME allowlist reads the service name before the legacy singular key', fragment: "this.app.get('${serviceConfigBase}AllowedMimeTypes')${legacyMimeTypesFallback}" },
  { label: 'upload helper attached in shared template', fragment: 'function attach_upload(remote: any)' },
  { label: 'download helper attached in shared template', fragment: 'function attach_download(remote: any)' },
]

const forbidden = [
  { label: 'broken windows slash normalization', fragment: ".replace(/\\/g, '/')" },
  { label: 'direct unvalidated binary join', fragment: 'return join(root, \\`\\${id}.bin\\`)' },
  { label: 'direct unvalidated metadata join', fragment: 'return join(root, \\`\\${id}.json\\`)' },
  { label: 'Base64 decoding before configured limit', fragment: "const buffer = Buffer.from(data.dataBase64, 'base64')" },
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
