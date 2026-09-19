#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = path => readFileSync(resolve(root, path), 'utf8')
const pkg = JSON.parse(read('package.json'))
const options = read('src/runtime/options/cache.ts')
const optionsIndex = read('src/runtime/options/index.ts')
const runtime = read('src/runtime/server/cache.ts')
const appUtils = read('src/runtime/server/app-utils.ts')
const bootstrap = read('src/runtime/server/bootstrap.ts')
const moduleSource = read('src/module.ts')
const pluginTemplate = read('src/runtime/templates/server/plugin.ts')
const serverTemplate = read('src/runtime/templates/server/server.ts')
const problems = []

function requireMatch(source, pattern, message) {
  if (!pattern.test(source))
    problems.push(message)
}

if (pkg.version !== '6.8.0')
  problems.push(`package version must be 6.8.0 for Patch073 r1 (found ${pkg.version})`)

if (pkg.dependencies?.redis || pkg.dependencies?.ioredis || pkg.devDependencies?.redis || pkg.devDependencies?.ioredis)
  problems.push('Patch073 r1 must not add a Redis client dependency')

if (!pkg.exports?.['./server-cache'] || !pkg.typesVersions?.['*']?.['server-cache'])
  problems.push('package exports/typesVersions must expose ./server-cache')

requireMatch(options, /export type NfzCacheProvider = 'memory'/, 'cache provider union must remain memory-only in r1')
requireMatch(options, /defaultTtlMs:\s*60_000/, 'cache default TTL must remain explicit')
requireMatch(options, /maxEntries:\s*1_000/, 'memory cache must have a bounded default entry count')
requireMatch(options, /failOpen:\s*true/, 'cache must default to fail-open')
requireMatch(options, /provider !== 'memory'/, 'cache option resolver must reject unimplemented providers')
requireMatch(moduleSource, /cache:\s*false/, 'module cache must be disabled by default')
requireMatch(optionsIndex, /cache\?: ResolvedCacheOptions/, 'private runtime config must carry resolved cache settings')

const publicConfigStart = optionsIndex.indexOf('export interface FeathersPublicRuntimeConfig')
const moduleConfigStart = optionsIndex.indexOf('export interface ModuleConfig')
if (publicConfigStart < 0 || moduleConfigStart < 0 || /\bcache\??:/.test(optionsIndex.slice(publicConfigStart, moduleConfigStart)))
  problems.push('cache configuration must not leak through FeathersPublicRuntimeConfig')

for (const token of [
  'export interface NfzCacheStore',
  'export class NfzCache',
  'createMemoryCacheStore',
  'getOrSet<T>',
  '#inflight',
  'defaultTtlMs',
  'maxEntries',
  'failOpen',
  'diagnostics()',
  'NFZ cache does not store undefined values',
]) requireMatch(runtime, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `runtime cache contract missing: ${token}`)

requireMatch(runtime, /while \(entries\.size >= options\.maxEntries\)/, 'memory store must evict when maxEntries is reached')
requireMatch(runtime, /expiresAt !== null && entry\.expiresAt <= Date\.now\(\)/, 'memory store must enforce TTL on reads')
requireMatch(runtime, /this\.#inflight\.get\(qualified\)/, 'getOrSet must deduplicate concurrent producers')

requireMatch(appUtils, /configureNfzCache\(app, config\?\.cache\)/, 'server infrastructure must initialize cache before other infrastructure')
requireMatch(bootstrap, /closeCacheInfrastructure/, 'server teardown must close cache infrastructure')
requireMatch(pluginTemplate, /cache: options\.cache \|\| false/, 'generated server config must include resolved cache settings')
requireMatch(pluginTemplate, /cache: privateConfig\.cache \?\? nfzBaseServerConfig\.cache/, 'private runtime cache override must merge without public leakage')
requireMatch(serverTemplate, /nuxt-feathers-zod\/server-cache/, 'generated server types must consume the public server-cache subpath')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Native cache foundation contract failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Native cache foundation contract passed: disabled-by-default, private memory provider, bounded TTL store, single-flight getOrSet, fail-open diagnostics and lifecycle integration.')
