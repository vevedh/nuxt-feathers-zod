import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const registry = read('src/runtime/auth/registry.ts')
const strategy = read('src/runtime/auth/strategies/local.ts')
const test = read('src/runtime/auth/strategies/local.test.ts')
const authIndex = read('src/runtime/auth/index.ts')
const windowsVerifier = read('scripts/verify-windows.ps1')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

requireText(registry, "import { NfzLocalStrategy } from './strategies/local'", 'NFZ local strategy import')
requireText(registry, "this.registerFactory('local', () => new NfzLocalStrategy())", 'NFZ local strategy registration')
requireText(strategy, "candidate._bsontype", 'BSON ObjectId structural marker')
requireText(strategy, "typeof candidate.toHexString === 'function'", 'BSON ObjectId structural conversion')
requireText(strategy, 'toHexString(): string', 'lint-safe BSON ObjectId method signature')
requireText(strategy, "const objectIdPattern = /^[0-9a-f]{24}$/i", 'strict MongoDB ObjectId shape')
requireText(strategy, 'if (!params.provider)', 'upstream internal local-authentication fast path')
requireText(strategy, 'const normalizedId = normalizeNfzAuthenticationEntityId(currentId)', 'provider-neutral local entity ID normalization')
requireText(strategy, 'return super.getEntity({', 'upstream local strategy delegation')
requireText(test, 'normalizes a BSON ObjectId from another driver copy', 'cross-driver ObjectId regression test')
requireText(test, 're-reads an externally authenticated entity with the normalized string ID', 'external entity re-read regression test')
requireText(test, 'does not change the internal local-strategy result path', 'internal authentication behavior regression test')
requireText(test, 'preserves portable primitive IDs for downstream validation', 'portable primitive identifier preservation regression')
requireText(test, "describe('nfz local authentication portable entity IDs'", 'portable local authentication test title')
requireText(authIndex, 'NfzLocalStrategy, normalizeNfzAuthenticationEntityId, normalizeNfzLocalEntityId', 'public authentication runtime exports')
requireText(windowsVerifier, "Invoke-BunCommand @('run', 'sanity:auth-mongodb-id')", 'early Windows MongoDB auth boundary guard')

if (registry.includes("new LocalStrategy()"))
  problems.push('registry must not restore the upstream LocalStrategy without the cross-driver ObjectId boundary')
if (strategy.includes('instanceof ObjectId'))
  problems.push('local authentication must not rely on ObjectId instanceof across bundled mongodb copies')
if (/String\(currentId\)/.test(strategy))
  problems.push('local authentication must not stringify arbitrary entity ID objects')
if (strategy.includes('toHexString: () => string'))
  problems.push('local authentication BSON interface must use a lint-safe method signature')
if (test.includes(' as Params'))
  problems.push('local authentication tests must not restore unnecessary Params assertions')

const internalFastPathIndex = strategy.indexOf('if (!params.provider)')
const normalizationIndex = strategy.indexOf('const normalizedId = normalizeNfzAuthenticationEntityId(currentId)')
if (internalFastPathIndex < 0 || normalizationIndex < 0 || internalFastPathIndex > normalizationIndex)
  problems.push('local authentication must preserve the exact upstream internal result before ObjectId normalization')
if (!test.includes('resolves.toBe(result)'))
  problems.push('local authentication regression coverage must preserve the exact internal result reference')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Authentication MongoDB ID boundary guard failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Authentication entity IDs preserve portable primitives and normalize cross-driver BSON ObjectIds without weakening adapter validation.')
