import type { MongoOptions, ResolvedMongoOptions } from './mongodb'
import { resolveMongoOptions } from './mongodb'

export type NfzDatabaseConnectionType = 'mongodb' | 'postgresql' | 'mysql' | 'mariadb' | 'sqlite'
export type NfzSqlConnectionType = Exclude<NfzDatabaseConnectionType, 'mongodb'>

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
}

export type ResolvedMongoDatabaseConnectionOptions = ResolvedMongoOptions & ResolvedNfzDatabaseConnectionBaseOptions & {
  type: 'mongodb'
  database?: string
}

export type ResolvedKnexDatabaseConnectionOptions =
  KnexDatabaseConnectionOptions & ResolvedNfzDatabaseConnectionBaseOptions & {
    client: string
  }

export type ResolvedNfzDatabaseConnectionOptions =
  | ResolvedMongoDatabaseConnectionOptions
  | ResolvedKnexDatabaseConnectionOptions

const CONNECTION_NAME_PATTERN = /^[a-z][\w-]{0,63}$/i

export function normalizeDatabaseConnectionName(input: unknown): string {
  const name = String(input || '').trim()
  if (!CONNECTION_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid database connection name '${name}'. Use 1-64 letters, numbers, underscores or dashes and start with a letter.`,
    )
  }
  return name
}

function defaultKnexClient(type: NfzSqlConnectionType): string {
  if (type === 'postgresql')
    return 'pg'
  if (type === 'mysql' || type === 'mariadb')
    return 'mysql2'
  return 'better-sqlite3'
}

function normalizeSearchPath(value: unknown): string[] | undefined {
  if (!Array.isArray(value))
    return undefined
  const normalized = value.map(item => String(item || '').trim()).filter(Boolean)
  return normalized.length ? [...new Set(normalized)] : undefined
}

export function resolveDatabaseConnection(
  nameInput: string,
  input: NfzDatabaseConnectionOptions,
  options: { legacy?: boolean } = {},
): ResolvedNfzDatabaseConnectionOptions {
  const name = normalizeDatabaseConnectionName(nameInput)
  const base = {
    name,
    enabled: input.enabled !== false,
    required: input.required !== false,
    healthCheck: input.healthCheck !== false,
    ...(input.label ? { label: String(input.label) } : {}),
    legacy: options.legacy === true,
  }

  if (input.type === 'mongodb') {
    const resolvedMongo = resolveMongoOptions(
      input,
      options.legacy ? '/mongo' : `/mongo/${name}`,
    )
    return {
      ...resolvedMongo,
      ...base,
      type: 'mongodb',
      ...(input.database ? { database: String(input.database).trim() } : {}),
    }
  }

  const connection = input.connection
  if (!connection || (typeof connection === 'string' && !connection.trim()))
    throw new Error(`Database connection '${name}' requires a non-empty connection value.`)

  const searchPath = normalizeSearchPath(input.searchPath)
  return {
    ...input,
    ...base,
    type: input.type,
    client: String(input.client || defaultKnexClient(input.type)).trim(),
    connection: typeof connection === 'string' ? connection.trim() : { ...connection },
    ...(input.pool ? { pool: { ...input.pool } } : {}),
    ...(input.type === 'sqlite' && input.useNullAsDefault == null ? { useNullAsDefault: true } : {}),
    ...(searchPath ? { searchPath } : {}),
  }
}
