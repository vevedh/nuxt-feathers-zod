import type {
  NfzDatabaseConnectionOptions,
  ResolvedNfzDatabaseConnectionOptions,
} from './connections'
import type { MongoOptions, ResolvedMongoOptions } from './mongodb'
import { normalizeDatabaseConnectionName, resolveDatabaseConnection } from './connections'
import { resolveMongoOptions } from './mongodb'

export interface DataBaseOptions {
  /** @deprecated Kept as a compatibility adapter. Prefer database.connections. */
  mongo?: MongoOptions
  default?: string
  connections?: Record<string, NfzDatabaseConnectionOptions>
}

export interface ResolvedDataBaseOptions {
  /** @deprecated Compatibility view of database.mongo. */
  mongo?: ResolvedMongoOptions
  default?: string
  connections: Record<string, ResolvedNfzDatabaseConnectionOptions>
}

export function resolveDataBaseOptions(database: DataBaseOptions = {}): ResolvedDataBaseOptions {
  const connections: Record<string, ResolvedNfzDatabaseConnectionOptions> = {}
  const configured = database.connections || {}

  for (const [rawName, input] of Object.entries(configured)) {
    if (!input || typeof input !== 'object')
      throw new Error(`Database connection '${rawName}' must be an object.`)
    const name = normalizeDatabaseConnectionName(rawName)
    if (connections[name])
      throw new Error(`Duplicate database connection '${name}'.`)
    connections[name] = resolveDatabaseConnection(name, input)
  }

  let mongo: ResolvedMongoOptions | undefined
  if (database.mongo) {
    if (connections.default) {
      throw new Error(
        'database.mongo cannot be combined with database.connections.default. '
        + 'Move the legacy MongoDB settings into the named connection or choose another connection name.',
      )
    }
    mongo = resolveMongoOptions(database.mongo, '/mongo')
    connections.default = resolveDatabaseConnection('default', {
      ...database.mongo,
      type: 'mongodb',
    }, { legacy: true })
  }

  const managementPaths = new Map<string, string>()
  for (const connection of Object.values(connections)) {
    if (connection.type !== 'mongodb' || !connection.enabled || !connection.management.enabled)
      continue
    const existing = managementPaths.get(connection.management.basePath)
    if (existing) {
      throw new Error(
        `MongoDB connections '${existing}' and '${connection.name}' expose the same management basePath '${connection.management.basePath}'.`,
      )
    }
    managementPaths.set(connection.management.basePath, connection.name)
  }

  const enabledNames = Object.values(connections).filter(connection => connection.enabled).map(connection => connection.name)
  const explicitDefault = database.default ? normalizeDatabaseConnectionName(database.default) : undefined
  const defaultConnection = explicitDefault || (connections.default?.enabled ? 'default' : enabledNames[0])

  if (explicitDefault && !connections[explicitDefault])
    throw new Error(`database.default references unknown connection '${explicitDefault}'.`)
  if (explicitDefault && !connections[explicitDefault]?.enabled)
    throw new Error(`database.default references disabled connection '${explicitDefault}'.`)

  return {
    ...(mongo ? { mongo } : {}),
    ...(defaultConnection ? { default: defaultConnection } : {}),
    connections,
  }
}

export type {
  KnexDatabaseConnectionOptions,
  KnexPoolOptions,
  MongoDatabaseConnectionOptions,
  NfzDatabaseConnectionOptions,
  NfzDatabaseConnectionType,
  NfzSqlConnectionType,
  ResolvedKnexDatabaseConnectionOptions,
  ResolvedMongoDatabaseConnectionOptions,
  ResolvedNfzDatabaseConnectionOptions,
} from './connections'
