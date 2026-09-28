#!/usr/bin/env node
import { readFileSync } from 'node:fs'
const read = path => readFileSync(path, 'utf8')
const capabilities = read('src/runtime/capabilities.ts')
const release = read('scripts/lib/release-contract.mjs')
const example = read('examples/real-world-nuxt4-daisyui-pinia-redis/nuxt.config.ts')
const route = read('examples/real-world-nuxt4-daisyui-pinia-redis/server/api/dashboard/summary.get.ts')
const docs = read('docs/guide/redis-cache.md')
const examplePkg = JSON.parse(read('examples/real-world-nuxt4-daisyui-pinia-redis/package.json'))
const pkg = JSON.parse(read('package.json'))
const problems = []
const need = (source, token, label) => { if (!source.includes(token)) problems.push(`${label}: missing ${token}`) }
need(capabilities, "providers: ['memory', 'redis']", 'capabilities')
need(capabilities, 'distributed: true', 'capabilities')
need(release, "providers: Object.freeze(['memory', 'redis'])", 'release contract')
need(release, 'distributed: true', 'release contract')
need(example, "provider: 'redis'", 'DaisyUiKit example')
need(example, 'REDIS_URL', 'DaisyUiKit server-only URL')
need(route, 'getNfzCache(app)', 'DaisyUiKit native cache access')
need(docs, 'SCAN` puis `UNLINK', 'public invalidation boundary')
need(docs, "ne constitue pas un verrou distribué", 'public single-flight boundary')
if (examplePkg.dependencies?.unstorage)
  problems.push('maintained DaisyUiKit example must not keep a direct Unstorage dependency')
if (examplePkg.dependencies?.ioredis !== '5.10.1')
  problems.push('maintained DaisyUiKit example must install the certified ioredis client directly')
if (pkg.peerDependencies?.ioredis !== '^5.10.1' || pkg.peerDependenciesMeta?.ioredis?.optional !== true)
  problems.push('ioredis must remain an optional peer dependency')
try { read('examples/real-world-nuxt4-daisyui-pinia-redis/server/plugins/redis-storage.ts'); problems.push('legacy Nitro/Unstorage Redis plugin must be removed') } catch {}
if (problems.length) {
  console.error('[Patch075 r3] Redis/Valkey promotion failed:')
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
console.log('[Patch075 r3] PASS: certified Redis/Valkey runtime is promoted across capabilities, release contract, native example and public boundaries.')
