import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const failures = []

function read(path) {
  return readFileSync(resolve(root, path), 'utf8')
}

function requireText(path, needle, label) {
  if (!read(path).includes(needle))
    failures.push(`${path} is missing ${label}`)
}

function forbidText(path, needle, label) {
  if (read(path).includes(needle))
    failures.push(`${path} still contains ${label}`)
}

requireText('src/cli/core/types.ts', "export type ServiceIdStrategy = 'objectid' | 'uuid' | 'integer' | 'bigint' | 'string'", 'portable identifier strategy union')
requireText('src/cli/core/types.ts', 'idStrategy?: ServiceIdStrategy', 'identifier strategy manifest metadata')
requireText('src/cli/identifiers.ts', "mongodb: ['objectid', 'uuid', 'string']", 'MongoDB identifier strategy support matrix')
requireText('src/cli/identifiers.ts', "knex: ['integer', 'bigint', 'uuid', 'string']", 'Knex identifier strategy support matrix')
requireText('src/cli/identifiers.ts', "return adapter === 'mongodb' ? 'objectid' : 'integer'", 'portable default identifier strategy')
requireText('src/cli/identifiers.ts', 'Invalid service identifier strategy:', 'fail-closed unsupported identifier strategy diagnostic')
requireText('src/cli/index.ts', "idStrategy: { type: 'enum', options: ['objectid', 'uuid', 'integer', 'bigint', 'string']", '--idStrategy CLI selector')
requireText('src/cli/core.ts', 'id: ${JSON.stringify(idField)}', 'explicit Feathers adapter id-field option')
requireText('src/cli/core.ts', "base = 'z.string().uuid()'", 'UUID Zod identifier schema')
requireText('src/cli/core.ts', "base = 'z.number().int()'", 'integer Zod identifier schema')
requireText('src/cli/core.ts', "Invalid bigint identifier", 'decimal-string bigint identifier schema')
requireText('src/cli/core.ts', "return strategy === 'uuid' || strategy === 'string'", 'client-assigned UUID/string create semantics')
requireText('src/runtime/zod/query.ts', 'function queryCompatibleProperty', 'querystring-compatible field coercion')
requireText('src/runtime/zod/query.ts', "if (inner instanceof z.ZodNumber)", 'number-only query coercion boundary')
requireText('src/runtime/zod/query.ts', "typeof value === 'string' && value.trim() !== ''", 'string query value coercion guard')
requireText('src/runtime/auth/strategies/local.ts', 'normalizeNfzAuthenticationEntityId', 'provider-neutral authentication entity ID normalizer')
requireText('src/runtime/auth/strategies/local.ts', 'normalizeNfzLocalEntityId', 'legacy authentication ID helper alias')
requireText('src/runtime/auth/index.ts', 'normalizeNfzAuthenticationEntityId', 'public server-auth export for portable entity normalization')
requireText('src/cli/commands/doctor.ts', 'idStrategy=${binding.idStrategy}', 'doctor identifier strategy diagnostics')
requireText('src/cli/commands/doctor.ts', 'isServiceIdStrategySupported(binding.adapter, binding.idStrategy)', 'doctor identifier/adapter compatibility check')
requireText('test/cli.spec.ts', 'qualifies identifier strategies per adapter without changing legacy defaults', 'identifier strategy matrix regression')
requireText('test/cli.spec.ts', 'generates a UUID SQL service with explicit adapter id and portable manifest metadata', 'generated UUID service regression')
requireText('test/doctor.spec.ts', 'rejects an identifier strategy that is incompatible with the generated adapter', 'doctor identifier strategy fail-closed regression')
requireText('src/runtime/zod/query.test.ts', 'coerces integer query values and sort order without changing string identifier semantics', 'portable query semantics regression')
requireText('src/runtime/auth/strategies/local.test.ts', 'preserves portable primitive IDs for downstream validation', 'portable authentication entity regression')
forbidText('src/cli/core.ts', 'z.bigint()', 'non-JSON-safe JavaScript bigint identifier schema')
forbidText('src/runtime/auth/strategies/local.ts', 'Number(currentId)', 'lossy authentication identifier coercion')

if (failures.length) {
  console.error('[nuxt-feathers-zod] Portable identifier guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Portable identifier, authentication entity and query semantics are aligned.')
