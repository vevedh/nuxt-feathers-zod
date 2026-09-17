import type { MongoOptions, ResolvedMongoOptions } from './mongodb'
import { resolveMongoOptions } from './mongodb'

export type NfzDatabaseConnectionType = 'mongodb' | 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql'
export type NfzSqlConnectionType = Exclude<NfzDatabaseConnectionType, 'mongodb'>
export type NfzDatabaseProvider = 'mongodb' | 'knex'
export type NfzDatabaseFamily = 'document' | 'sql'
export type NfzDatabaseCertification = 'certified' | 'implemented'

export interface NfzDatabaseCapabilities {
  healthCheck: boolean
  namedConnections: boolean
  transactions: boolean
  schemaNamespaces: boolean
  indexManagement: boolean
  migrations: boolean
  nativeObjectId: boolean
}

export interface NfzSqlPoolDefaults {
  min: number
  max: number
}

export interface NfzDatabaseProviderDescriptor {
  type: NfzDatabaseConnectionType
  provider: NfzDatabaseProvider
  databaseFamily: NfzDatabaseFamily
  adapter: 'mongodb' | 'knex'
  certification: NfzDatabaseCertification
  defaultClient?: string
  driverPackage?: string
  poolDefaults?: NfzSqlPoolDefaults
  capabilities: NfzDatabaseCapabilities
}

const BASE_CAPABILITIES = {
  healthCheck: true,
  namedConnections: true,
  transactions: false,
  indexManagement: false,
  migrations: false,
} as const

const DATABASE_PROVIDER_DESCRIPTORS: Record<NfzDatabaseConnectionType, NfzDatabaseProviderDescriptor> = {
  mongodb: {
    type: 'mongodb',
    provider: 'mongodb',
    databaseFamily: 'document',
    adapter: 'mongodb',
    certification: 'certified',
    capabilities: {
      ...BASE_CAPABILITIES,
      schemaNamespaces: false,
      nativeObjectId: true,
    },
  },
  postgresql: {
    type: 'postgresql',
    provider: 'knex',
    databaseFamily: 'sql',
    adapter: 'knex',
    certification: 'certified',
    defaultClient: 'pg',
    driverPackage: 'pg',
    poolDefaults: { min: 0, max: 10 },
    capabilities: {
      ...BASE_CAPABILITIES,
      transactions: true,
      schemaNamespaces: true,
      nativeObjectId: false,
    },
  },
  mysql: {
    type: 'mysql',
    provider: 'knex',
    databaseFamily: 'sql',
    adapter: 'knex',
    certification: 'certified',
    defaultClient: 'mysql2',
    driverPackage: 'mysql2',
    poolDefaults: { min: 0, max: 10 },
    capabilities: {
      ...BASE_CAPABILITIES,
      transactions: true,
      schemaNamespaces: false,
      nativeObjectId: false,
    },
  },
  mariadb: {
    type: 'mariadb',
    provider: 'knex',
    databaseFamily: 'sql',
    adapter: 'knex',
    certification: 'certified',
    defaultClient: 'mysql2',
    driverPackage: 'mysql2',
    poolDefaults: { min: 0, max: 10 },
    capabilities: {
      ...BASE_CAPABILITIES,
      transactions: true,
      schemaNamespaces: false,
      nativeObjectId: false,
    },
  },
  sqlite: {
    type: 'sqlite',
    provider: 'knex',
    databaseFamily: 'sql',
    adapter: 'knex',
    certification: 'certified',
    defaultClient: 'better-sqlite3',
    driverPackage: 'better-sqlite3',
    poolDefaults: { min: 0, max: 1 },
    capabilities: {
      ...BASE_CAPABILITIES,
      transactions: true,
      schemaNamespaces: false,
      nativeObjectId: false,
    },
  },
  mssql: {
    type: 'mssql',
    provider: 'knex',
    databaseFamily: 'sql',
    adapter: 'knex',
    certification: 'certified',
    defaultClient: 'mssql',
    driverPackage: 'tedious',
    poolDefaults: { min: 0, max: 10 },
    capabilities: {
      ...BASE_CAPABILITIES,
      transactions: true,
      schemaNamespaces: true,
      nativeObjectId: false,
    },
  },
}

export const NFZ_DATABASE_CONNECTION_TYPES = Object.freeze(
  Object.keys(DATABASE_PROVIDER_DESCRIPTORS) as NfzDatabaseConnectionType[],
)

export function listNfzDatabaseProviderDescriptors(): NfzDatabaseProviderDescriptor[] {
  return NFZ_DATABASE_CONNECTION_TYPES.map(type => getNfzDatabaseProviderDescriptor(type))
}

function cloneCapabilities(capabilities: NfzDatabaseCapabilities): NfzDatabaseCapabilities {
  return { ...capabilities }
}

export function getNfzDatabaseProviderDescriptor(typeInput: string): NfzDatabaseProviderDescriptor {
  const type = String(typeInput || '').trim() as NfzDatabaseConnectionType
  const descriptor = DATABASE_PROVIDER_DESCRIPTORS[type]
  if (!descriptor) {
    throw new Error(
      `Unsupported database connection type '${String(typeInput || '').trim()}'. `
      + `Supported types: ${NFZ_DATABASE_CONNECTION_TYPES.join(', ')}.`,
    )
  }
  return {
    ...descriptor,
    ...(descriptor.poolDefaults ? { poolDefaults: { ...descriptor.poolDefaults } } : {}),
    capabilities: cloneCapabilities(descriptor.capabilities),
  }
}

export function getNfzDefaultDatabaseClient(type: NfzSqlConnectionType): string {
  const descriptor = getNfzDatabaseProviderDescriptor(type)
  if (descriptor.provider !== 'knex' || !descriptor.defaultClient) {
    throw new Error(`Database connection type '${type}' does not define a Knex client.`)
  }
  return descriptor.defaultClient
}

export function getNfzSqlDriverPackage(type: NfzSqlConnectionType): string {
  const descriptor = getNfzDatabaseProviderDescriptor(type)
  if (descriptor.provider !== 'knex' || !descriptor.driverPackage)
    throw new Error(`Database connection type '${type}' does not define an SQL driver package.`)
  return descriptor.driverPackage
}

export function getNfzSqlPoolDefaults(type: NfzSqlConnectionType): NfzSqlPoolDefaults {
  const descriptor = getNfzDatabaseProviderDescriptor(type)
  if (descriptor.provider !== 'knex' || !descriptor.poolDefaults)
    throw new Error(`Database connection type '${type}' does not define SQL pool defaults.`)
  return { ...descriptor.poolDefaults }
}

export interface NfzDatabaseConnectionBaseOptions {
  enabled?: boolean
  required?: boolean
  healthCheck?: boolean
  label?: string
}

export type MongoDatabaseConnectionOptions = MongoOptions & NfzDatabaseConnectionBaseOptions & {
  type: 'mongodb'
  database?: string
}

export interface KnexPoolOptions {
  min?: number
  max?: number
  idleTimeoutMillis?: number
  acquireTimeoutMillis?: number
  createTimeoutMillis?: number
  destroyTimeoutMillis?: number
  reapIntervalMillis?: number
}

export interface KnexDatabaseConnectionOptions extends NfzDatabaseConnectionBaseOptions {
  type: NfzSqlConnectionType
  client?: string
  driverPackage?: string
  connection: string | Record<string, unknown>
  pool?: KnexPoolOptions
  acquireConnectionTimeout?: number
  useNullAsDefault?: boolean
  searchPath?: string[]
}

export type NfzDatabaseConnectionOptions = MongoDatabaseConnectionOptions | KnexDatabaseConnectionOptions

export interface ResolvedNfzDatabaseConnectionBaseOptions {
  name: string
  enabled: boolean
  required: boolean
  healthCheck: boolean
  label?: string
  legacy: boolean
  provider: NfzDatabaseProvider
  databaseFamily: NfzDatabaseFamily
  adapter: 'mongodb' | 'knex'
  certification: NfzDatabaseCertification
  capabilities: NfzDatabaseCapabilities
}

export type ResolvedMongoDatabaseConnectionOptions = ResolvedMongoOptions & ResolvedNfzDatabaseConnectionBaseOptions & {
  type: 'mongodb'
  provider: 'mongodb'
  databaseFamily: 'document'
  adapter: 'mongodb'
  database?: string
}

export type ResolvedKnexDatabaseConnectionOptions =
  KnexDatabaseConnectionOptions & ResolvedNfzDatabaseConnectionBaseOptions & {
    provider: 'knex'
    databaseFamily: 'sql'
    adapter: 'knex'
    client: string
    defaultClient: string
    driverPackage: string
    customClient: boolean
    pool: KnexPoolOptions
    acquireConnectionTimeout: number
  }

export type ResolvedNfzDatabaseConnectionOptions =
  | ResolvedMongoDatabaseConnectionOptions
  | ResolvedKnexDatabaseConnectionOptions

const CONNECTION_NAME_PATTERN = /^[a-z][\w-]{0,63}$/i

const SQL_DRIVER_PACKAGE_PATTERN = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i
const DEFAULT_ACQUIRE_CONNECTION_TIMEOUT = 60_000

function normalizePoolInteger(
  connectionName: string,
  key: keyof KnexPoolOptions,
  value: unknown,
  fallback: number,
  minimum = 0,
): number {
  if (value == null)
    return fallback
  if (!Number.isInteger(value) || Number(value) < minimum) {
    throw new Error(
      `Database connection '${connectionName}' pool.${String(key)} must be an integer >= ${minimum}.`,
    )
  }
  return Number(value)
}

function normalizeOptionalPoolInteger(
  connectionName: string,
  key: keyof KnexPoolOptions,
  value: unknown,
): number | undefined {
  if (value == null)
    return undefined
  return normalizePoolInteger(connectionName, key, value, 0)
}

function resolveSqlPoolOptions(
  connectionName: string,
  type: NfzSqlConnectionType,
  pool: KnexPoolOptions | undefined,
): KnexPoolOptions {
  const defaults = getNfzSqlPoolDefaults(type)
  const min = normalizePoolInteger(connectionName, 'min', pool?.min, defaults.min)
  const max = normalizePoolInteger(connectionName, 'max', pool?.max, defaults.max, 1)

  if (min > max)
    throw new Error(`Database connection '${connectionName}' requires pool.min <= pool.max.`)
  if (type === 'sqlite' && max !== 1) {
    throw new Error(
      `Database connection '${connectionName}' uses SQLite and requires pool.max=1 to preserve single-file connection semantics.`,
    )
  }

  const resolved: KnexPoolOptions = { min, max }
  for (const key of [
    'idleTimeoutMillis',
    'acquireTimeoutMillis',
    'createTimeoutMillis',
    'destroyTimeoutMillis',
    'reapIntervalMillis',
  ] as const) {
    const value = normalizeOptionalPoolInteger(connectionName, key, pool?.[key])
    if (value != null)
      resolved[key] = value
  }
  return resolved
}

function normalizeDriverPackage(connectionName: string, value: unknown): string {
  const driverPackage = String(value || '').trim()
  if (!driverPackage || !SQL_DRIVER_PACKAGE_PATTERN.test(driverPackage)) {
    throw new Error(
      `Database connection '${connectionName}' driverPackage must be a bare npm package name.`,
    )
  }
  return driverPackage
}

function normalizeAcquireConnectionTimeout(connectionName: string, value: unknown): number {
  if (value == null)
    return DEFAULT_ACQUIRE_CONNECTION_TIMEOUT
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(
      `Database connection '${connectionName}' acquireConnectionTimeout must be a positive integer.`,
    )
  }
  return Number(value)
}

export function normalizeDatabaseConnectionName(input: unknown): string {
  const name = String(input || '').trim()
  if (!CONNECTION_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid database connection name '${name}'. Use 1-64 letters, numbers, underscores or dashes and start with a letter.`,
    )
  }
  return name
}

function normalizeSearchPath(value: unknown): string[] | undefined {
  if (!Array.isArray(value))
    return undefined
  const normalized = value.map(item => String(item || '').trim()).filter(Boolean)
  return normalized.length ? [...new Set(normalized)] : undefined
}

function normalizeSqlConnectionValue(
  connectionName: string,
  type: NfzSqlConnectionType,
  connection: string | Record<string, unknown>,
): string | Record<string, unknown> {
  if (typeof connection === 'string')
    return connection.trim()

  const normalized = { ...connection }
  if (type !== 'mssql')
    return normalized

  const rawOptions = normalized.options
  if (rawOptions != null && (typeof rawOptions !== 'object' || Array.isArray(rawOptions))) {
    throw new Error(
      `Database connection '${connectionName}' MSSQL connection.options must be an object when provided.`,
    )
  }

  const options = { ...((rawOptions || {}) as Record<string, unknown>) }
  if (options.lowerCaseGuids == null)
    options.lowerCaseGuids = true
  normalized.options = options
  return normalized
}

export function resolveDatabaseConnection(
  nameInput: string,
  input: NfzDatabaseConnectionOptions,
  options: { legacy?: boolean } = {},
): ResolvedNfzDatabaseConnectionOptions {
  const name = normalizeDatabaseConnectionName(nameInput)
  const descriptor = getNfzDatabaseProviderDescriptor(String(input.type || ''))
  const base = {
    name,
    enabled: input.enabled !== false,
    required: input.required !== false,
    healthCheck: input.healthCheck !== false,
    ...(input.label ? { label: String(input.label) } : {}),
    legacy: options.legacy === true,
    provider: descriptor.provider,
    databaseFamily: descriptor.databaseFamily,
    adapter: descriptor.adapter,
    certification: descriptor.certification,
    capabilities: cloneCapabilities(descriptor.capabilities),
  }

  if (descriptor.provider === 'mongodb') {
    const mongoInput = input as MongoDatabaseConnectionOptions
    const resolvedMongo = resolveMongoOptions(
      mongoInput,
      options.legacy ? '/mongo' : `/mongo/${name}`,
    )
    return {
      ...resolvedMongo,
      ...base,
      type: 'mongodb',
      provider: 'mongodb',
      databaseFamily: 'document',
      adapter: 'mongodb',
      ...(mongoInput.database ? { database: String(mongoInput.database).trim() } : {}),
    }
  }

  const sqlInput = input as KnexDatabaseConnectionOptions
  const connection = sqlInput.connection
  if (!connection || (typeof connection === 'string' && !connection.trim()))
    throw new Error(`Database connection '${name}' requires a non-empty connection value.`)

  const defaultClient = getNfzDefaultDatabaseClient(sqlInput.type)
  const client = String(sqlInput.client || defaultClient).trim()
  if (!client)
    throw new Error(`Database connection '${name}' requires a non-empty Knex client.`)

  const customClient = client !== defaultClient
  if (customClient && !sqlInput.driverPackage) {
    throw new Error(
      `Database connection '${name}' uses custom Knex client '${client}' and must declare driverPackage explicitly.`,
    )
  }
  const driverPackage = normalizeDriverPackage(
    name,
    sqlInput.driverPackage || getNfzSqlDriverPackage(sqlInput.type),
  )
  const pool = resolveSqlPoolOptions(name, sqlInput.type, sqlInput.pool)
  const acquireConnectionTimeout = normalizeAcquireConnectionTimeout(name, sqlInput.acquireConnectionTimeout)
  const searchPath = normalizeSearchPath(sqlInput.searchPath)
  return {
    ...sqlInput,
    ...base,
    type: sqlInput.type,
    provider: 'knex',
    databaseFamily: 'sql',
    adapter: 'knex',
    client,
    defaultClient,
    driverPackage,
    customClient,
    connection: normalizeSqlConnectionValue(name, sqlInput.type, connection),
    pool,
    acquireConnectionTimeout,
    ...(sqlInput.type === 'sqlite' && sqlInput.useNullAsDefault == null ? { useNullAsDefault: true } : {}),
    ...(searchPath ? { searchPath } : {}),
  }
}
