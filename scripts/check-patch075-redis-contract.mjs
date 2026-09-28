#!/usr/bin/env node
import { readFileSync } from 'node:fs'
const read = path => readFileSync(path, 'utf8')
const options = read('src/runtime/options/cache.ts')
const runtime = read('src/runtime/server/cache.ts')
const optionsIndex = read('src/runtime/options/index.ts')
const capabilities = read('src/runtime/capabilities.ts')
const pkg = JSON.parse(read('package.json'))
const problems = []
const need = (source, token, message) => { if (!source.includes(token)) problems.push(message) }
need(options, "NfzCacheProvider = 'memory' | 'redis'", 'provider union must include redis')
need(options, "provider: 'redis'", 'resolved Redis branch missing')
need(options, 'cache.redis.url must use the redis:// or rediss:// protocol.', 'Redis URL protocol validation missing')
need(runtime, 'NfzCacheStoreHealth', 'provider-neutral health contract missing')
need(runtime, "store.provider !== options.provider", 'store/provider mismatch guard missing')
need(optionsIndex, 'RedisCacheOptions', 'Redis option types must be publicly exported')
need(capabilities, "providers: ['memory', 'redis']", 'r3 capabilities must advertise certified Redis/Valkey runtime')
need(capabilities, 'distributed: true', 'r3 distributed capability missing')
if (pkg.dependencies?.redis || pkg.dependencies?.ioredis || pkg.devDependencies?.redis || pkg.devDependencies?.ioredis)
  problems.push('Redis clients must remain optional peers, not mandatory runtime/dev dependencies')
const publicStart = optionsIndex.indexOf('export interface FeathersPublicRuntimeConfig')
const moduleStart = optionsIndex.indexOf('export interface ModuleConfig')
if (publicStart < 0 || moduleStart < 0 || /\bcache\??:/.test(optionsIndex.slice(publicStart, moduleStart)))
  problems.push('cache/Redis configuration must remain server-only')
if (problems.length) {
  console.error('[Patch075 r1] Redis/Valkey contract failed:')
  for (const p of problems) console.error(`- ${p}`)
  process.exit(1)
}
console.log('[Patch075 r1] PASS: provider-neutral cache contract, private Redis/Valkey configuration, health surface and memory compatibility guards.')
