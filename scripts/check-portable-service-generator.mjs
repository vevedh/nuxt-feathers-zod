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

requireText('src/cli/core/types.ts', "export type ServiceDatabaseType = 'mongodb' | 'postgresql' | 'mysql' | 'mariadb' | 'sqlite'", 'portable service database type')
requireText('src/cli/index.ts', "database: { type: 'enum', options: ['mongodb', 'postgresql', 'mysql', 'mariadb', 'sqlite']", '--database CLI selector')
requireText('src/cli/index.ts', 'resolveServiceAdapter(requestedAdapter, databaseType)', 'database-to-adapter resolution')
requireText('src/cli/core.ts', '...serviceDatabaseMetadata(opts.adapter, opts.databaseType)', 'service manifest database identity metadata')
requireText('src/cli/core.ts', 'Database type: ${manifest.databaseType}', 'manifest database diagnostics')
requireText('src/cli/commands/doctor.ts', 'detectServiceDatabaseBindings(absServicesDirs)', 'doctor service database binding discovery')
requireText('src/cli/commands/doctor.ts', "declares databaseType '${binding.databaseType}' but connection '${targetName}' is configured as '${connection.type}'", 'doctor database type mismatch diagnostic')
requireText('test/cli.spec.ts', 'generates a portable PostgreSQL service from --database', 'portable PostgreSQL generator regression')
requireText('test/doctor.spec.ts', 'diagnoses generated service database bindings against named connection types', 'doctor binding regression')
forbidText('src/cli/index.ts', "databaseType === 'mongodb' ? '_id'", 'direct database-type-specific ID inference; use the portable identifier strategy layer instead')

if (failures.length) {
  console.error('[nuxt-feathers-zod] Portable service generator guard failed:')
  for (const failure of failures)
    console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Portable service generator and CLI are aligned: named connections, database identity metadata, compatibility adapters and doctor diagnostics.')
