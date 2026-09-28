import fs from 'node:fs'

const cache = fs.readFileSync('src/runtime/server/cache.ts', 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const required = [
  ['native Redis store', 'createRedisCacheStore'],
  ['lazy ioredis import', "import('ioredis')"],
  ['bounded connect timeout', 'connectTimeoutMs'],
  ['bounded command timeout', 'commandTimeoutMs'],
  ['health probe', "command('PING'"],
  ['safe scan invalidation', "command('SCAN'"],
  ['non-blocking unlink invalidation', "command('UNLINK'"],
  ['versioned serialization', 'version: 1'],
]
for (const [label, marker] of required) {
  if (!cache.includes(marker))
    throw new Error(`[Patch075 r2] Missing ${label}: ${marker}`)
}
if (/\bKEYS\b/.test(cache))
  throw new Error('[Patch075 r2] Redis KEYS is forbidden in native cache runtime.')
const redisStoreBlock = cache.slice(cache.indexOf("return {\n    provider: 'redis'"), cache.indexOf('export function createMemoryCacheStore'))
if (/async size\s*\(/.test(redisStoreBlock))
  throw new Error('[Patch075 r5] Redis diagnostics must not expose size(): distributed entry counting would scan the keyspace implicitly.')
if (pkg.peerDependencies?.ioredis !== '^5.10.1' || pkg.peerDependenciesMeta?.ioredis?.optional !== true)
  throw new Error('[Patch075 r2] ioredis must remain an optional peer dependency.')
console.log('[Patch075 r2] Native Redis/Valkey runtime contract passed.')
