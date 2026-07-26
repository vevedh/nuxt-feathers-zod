import type { Db } from 'mongodb'
import type {
  ResolvedDataBaseOptions,
  ResolvedKnexDatabaseConnectionOptions,
  ResolvedMongoDatabaseConnectionOptions,
  ResolvedNfzDatabaseConnectionOptions,
} from '../options/database'

import { createRequire } from 'node:module'
import { MongoClient as MongoClientConstructor } from 'mongodb'
import { registerMongoManagementServices } from './mongodb'

export type NfzDatabaseConnectionState = 'idle' | 'connecting' | 'ready' | 'failed' | 'closed'

export interface NfzDatabaseConnectionDiagnostics {
  name: string
  type: ResolvedNfzDatabaseConnectionOptions['type']
  label?: string
  default: boolean
  legacy: boolean
  required: boolean
  healthCheck: boolean
  state: NfzDatabaseConnectionState
  connected: boolean
  connectedAt?: string
  lastHealthCheckAt?: string
  latencyMs?: number
  database?: string
  error?: {
    name: string
    message: string
  }
}

export interface NfzDatabaseConnectionHandle {
  name: string
  type: ResolvedNfzDatabaseConnectionOptions['type']
  config: ResolvedNfzDatabaseConnectionOptions
  state: NfzDatabaseConnectionState
  client?: unknown
  database?: Db
  databaseName?: string
  connectedAt?: Date
  lastHealthCheckAt?: Date
  latencyMs?: number
  error?: Error
  close(): Promise<void>
  healthCheck(): Promise<number>
}

export interface NfzDatabaseRegistry {
  readonly defaultConnection?: string
  readonly connections: Map<string, NfzDatabaseConnectionHandle>
  get(name?: string): NfzDatabaseConnectionHandle
  has(name: string): boolean
  connectAll(): Promise<void>
  closeAll(): Promise<void>
  diagnostics(): NfzDatabaseConnectionDiagnostics[]
  check(name?: string): Promise<NfzDatabaseConnectionDiagnostics>
}

export interface NfzDatabaseConnectorResult {
  client: unknown
  database?: Db
  databaseName?: string
  close(): Promise<void>
  healthCheck(): Promise<void>
}

export interface NfzDatabaseConnectorContext {
  name: string
  config: ResolvedNfzDatabaseConnectionOptions
}

export interface NfzDatabaseRegistryDependencies {
  connectMongo?(
    context: NfzDatabaseConnectorContext & { config: ResolvedMongoDatabaseConnectionOptions },
  ): Promise<NfzDatabaseConnectorResult>
  connectKnex?(
    context: NfzDatabaseConnectorContext & { config: ResolvedKnexDatabaseConnectionOptions },
  ): Promise<NfzDatabaseConnectorResult>
}

function safeError(error: unknown): Error {
  if (error instanceof Error)
    return error
  return new Error(String(error || 'Unknown database error'))
}

function sanitizeError(error?: Error): NfzDatabaseConnectionDiagnostics['error'] | undefined {
  if (!error)
    return undefined

  const message = String(error.message || error.name || 'Database connection failed')
    .replace(/(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|mariadb):\/\/\S+/gi, '[redacted-database-url]')
    .replace(/password\s*[=:]\s*[^\s,;]+/gi, 'password=[redacted]')

  return {
    name: error.name || 'Error',
    message: message.slice(0, 500),
  }
}

function inferMongoDatabaseName(connection: string, explicit?: string): string {
  if (explicit)
    return explicit
  try {
    const parsed = new URL(connection)
    return String(parsed.pathname || '').replace(/^\//, '') || 'test'
  }
  catch {
    return 'test'
  }
}

async function defaultConnectMongo(
  { config }: NfzDatabaseConnectorContext & { config: ResolvedMongoDatabaseConnectionOptions },
): Promise<NfzDatabaseConnectorResult> {
  const {
    url,
    database,
    management: _management,
    name: _name,
    type: _type,
    enabled: _enabled,
    required: _required,
    healthCheck: _healthCheck,
    label: _label,
    legacy: _legacy,
    ...clientOptions
  } = config

  const client = await MongoClientConstructor.connect(url, clientOptions)
  const databaseName = inferMongoDatabaseName(url, database)
  const db = client.db(databaseName)

  return {
    client,
    database: db,
    databaseName,
    async close() {
      await client.close()
    },
    async healthCheck() {
      await db.command({ ping: 1 })
    },
  }
}

function loadKnexFactory(): (config: Record<string, unknown>) => any {
  const require = createRequire(import.meta.url)
  try {
    const packageName = 'knex'
    const module = require(packageName)
    const factory = module.default || module.knex || module
    if (typeof factory !== 'function')
      throw new TypeError('The knex package did not expose a callable factory.')
    return factory
  }
  catch (error) {
    throw new Error(
      'A named SQL connection requires the optional `knex` package and the matching driver. '
      + 'Install `@feathersjs/knex knex` plus `pg`, `mysql2`, or `better-sqlite3`.',
      { cause: error },
    )
  }
}

async function defaultConnectKnex(
  { config }: NfzDatabaseConnectorContext & { config: ResolvedKnexDatabaseConnectionOptions },
): Promise<NfzDatabaseConnectorResult> {
  const knexFactory = loadKnexFactory()
  const knexConfig: Record<string, unknown> = {
    client: config.client,
    connection: config.connection,
    ...(config.pool ? { pool: config.pool } : {}),
    ...(config.acquireConnectionTimeout != null ? { acquireConnectionTimeout: config.acquireConnectionTimeout } : {}),
    ...(config.useNullAsDefault != null ? { useNullAsDefault: config.useNullAsDefault } : {}),
    ...(config.searchPath?.length ? { searchPath: config.searchPath } : {}),
  }
  const client = knexFactory(knexConfig)

  return {
    client,
    async close() {
      await client.destroy()
    },
    async healthCheck() {
      await client.raw('select 1 as nfz_health')
    },
  }
}

function toDiagnostics(
  handle: NfzDatabaseConnectionHandle,
  defaultConnection?: string,
): NfzDatabaseConnectionDiagnostics {
  return {
    name: handle.name,
    type: handle.type,
    ...(handle.config.label ? { label: handle.config.label } : {}),
    default: handle.name === defaultConnection,
    legacy: handle.config.legacy,
    required: handle.config.required,
    healthCheck: handle.config.healthCheck,
    state: handle.state,
    connected: handle.state === 'ready',
    ...(handle.connectedAt ? { connectedAt: handle.connectedAt.toISOString() } : {}),
    ...(handle.lastHealthCheckAt ? { lastHealthCheckAt: handle.lastHealthCheckAt.toISOString() } : {}),
    ...(handle.latencyMs != null ? { latencyMs: handle.latencyMs } : {}),
    ...(handle.databaseName ? { database: handle.databaseName } : {}),
    ...(handle.error ? { error: sanitizeError(handle.error) } : {}),
  }
}

export function createNfzDatabaseRegistry(
  config: ResolvedDataBaseOptions,
  dependencies: NfzDatabaseRegistryDependencies = {},
): NfzDatabaseRegistry {
  const connections = new Map<string, NfzDatabaseConnectionHandle>()
  const defaultConnection = config.default

  for (const connectionConfig of Object.values(config.connections)) {
    if (!connectionConfig.enabled)
      continue

    const handle: NfzDatabaseConnectionHandle = {
      name: connectionConfig.name,
      type: connectionConfig.type,
      config: connectionConfig,
      state: 'idle',
      async close() {},
      async healthCheck() {
        throw new Error(`Database connection '${connectionConfig.name}' is not ready.`)
      },
    }
    connections.set(handle.name, handle)
  }

  const get = (name?: string): NfzDatabaseConnectionHandle => {
    const resolvedName = name || defaultConnection
    if (!resolvedName)
      throw new Error('No default database connection is configured. Pass an explicit connection name.')
    const handle = connections.get(resolvedName)
    if (!handle)
      throw new Error(`Database connection '${resolvedName}' is not configured or is disabled.`)
    return handle
  }

  const connectHandle = async (handle: NfzDatabaseConnectionHandle): Promise<void> => {
    if (handle.state === 'ready')
      return

    handle.state = 'connecting'
    handle.error = undefined
    const started = Date.now()
    let result: NfzDatabaseConnectorResult | undefined
    try {
      if (handle.type === 'mongodb') {
        result = await (dependencies.connectMongo || defaultConnectMongo)({
          name: handle.name,
          config: handle.config as ResolvedMongoDatabaseConnectionOptions,
        })
      }
      else {
        result = await (dependencies.connectKnex || defaultConnectKnex)({
          name: handle.name,
          config: handle.config as ResolvedKnexDatabaseConnectionOptions,
        })
      }

      const connectedResult = result
      handle.client = connectedResult.client
      handle.database = connectedResult.database
      handle.databaseName = connectedResult.databaseName
      handle.close = async () => {
        await connectedResult.close()
      }
      handle.healthCheck = async () => {
        const checkStarted = Date.now()
        await connectedResult.healthCheck()
        handle.lastHealthCheckAt = new Date()
        handle.latencyMs = Date.now() - checkStarted
        handle.state = 'ready'
        handle.error = undefined
        return handle.latencyMs
      }
      handle.connectedAt = new Date()
      handle.state = 'ready'
      handle.latencyMs = Date.now() - started

      if (handle.config.healthCheck)
        await handle.healthCheck()
    }
    catch (error) {
      const failure = safeError(error)
      if (result) {
        try {
          await result.close()
        }
        catch (closeError) {
          failure.message += `; cleanup failed: ${safeError(closeError).message}`
        }
      }
      handle.client = undefined
      handle.database = undefined
      handle.databaseName = undefined
      handle.connectedAt = undefined
      handle.close = async () => {}
      handle.healthCheck = async () => {
        throw handle.error || failure
      }
      handle.state = 'failed'
      handle.error = failure
      if (handle.config.required)
        throw new Error(`Required database connection '${handle.name}' failed: ${failure.message}`, { cause: failure })
    }
  }

  const closeHandles = async (handles: NfzDatabaseConnectionHandle[]): Promise<void> => {
    const failures: Error[] = []
    for (const handle of handles) {
      if (handle.state !== 'ready' && handle.state !== 'connecting')
        continue
      try {
        await handle.close()
        handle.state = 'closed'
      }
      catch (error) {
        const failure = safeError(error)
        handle.error = failure
        failures.push(failure)
      }
    }
    if (failures.length)
      throw new AggregateError(failures, 'One or more database connections failed to close cleanly.')
  }

  return {
    defaultConnection,
    connections,
    get,
    has(name: string) {
      return connections.has(name)
    },
    async connectAll() {
      try {
        for (const handle of connections.values())
          await connectHandle(handle)
      }
      catch (error) {
        const opened = [...connections.values()]
          .filter(handle => handle.state === 'ready')
          .reverse()
        try {
          await closeHandles(opened)
        }
        catch (rollbackError) {
          throw new AggregateError(
            [safeError(error), safeError(rollbackError)],
            'Database startup failed and one or more opened connections could not be rolled back cleanly.',
          )
        }
        throw error
      }
    },
    async closeAll() {
      await closeHandles([...connections.values()].reverse())
    },
    diagnostics() {
      return [...connections.values()].map(handle => toDiagnostics(handle, defaultConnection))
    },
    async check(name?: string) {
      const handle = get(name)
      await handle.healthCheck()
      return toDiagnostics(handle, defaultConnection)
    },
  }
}

function setLegacyAliases(app: any, registry: NfzDatabaseRegistry): void {
  const defaultHandle = registry.defaultConnection ? registry.connections.get(registry.defaultConnection) : undefined
  const mongoHandle = defaultHandle?.type === 'mongodb'
    ? defaultHandle
    : [...registry.connections.values()].find(handle => handle.type === 'mongodb' && handle.config.legacy)

  if (mongoHandle?.database && mongoHandle.client) {
    app.set('mongodbClient', Promise.resolve(mongoHandle.database))
    app.set('mongodbDb', mongoHandle.database)
    app.set('mongodbConnection', mongoHandle.client)
    app.set('currentDatabase', mongoHandle.databaseName || 'test')
    app.set('mongodb_ok', true)
  }

  if (defaultHandle && defaultHandle.type !== 'mongodb' && defaultHandle.client)
    app.set('knexClient', defaultHandle.client)
}

export function createDatabaseInfrastructure(dependencies: NfzDatabaseRegistryDependencies = {}) {
  return async function configureDatabaseInfrastructure(app: any, config: ResolvedDataBaseOptions): Promise<void> {
    const registry = createNfzDatabaseRegistry(config, dependencies)
    app.set('databaseRegistry', registry)
    app.set('databaseConnections', registry.connections)
    app.set('database_ok', false)

    try {
      await registry.connectAll()

      for (const handle of registry.connections.values()) {
        if (handle.type === 'mongodb' && handle.database) {
          await registerMongoManagementServices(
            app,
            handle.database,
            (handle.config as ResolvedMongoDatabaseConnectionOptions).management,
          )
        }
      }

      setLegacyAliases(app, registry)
      app.set('database_ok', registry.diagnostics().every(item => item.state === 'ready' || !item.required))
    }
    catch (error) {
      try {
        await registry.closeAll()
      }
      catch (closeError) {
        throw new AggregateError(
          [safeError(error), safeError(closeError)],
          'Database infrastructure failed and one or more connections could not be closed cleanly.',
        )
      }
      throw error
    }
  }
}

export function getNfzDatabaseRegistry(app: any): NfzDatabaseRegistry {
  const registry = app?.get?.('databaseRegistry') as NfzDatabaseRegistry | undefined
  if (!registry)
    throw new Error('NFZ database registry is not configured. Enable feathers.database.connections or database.mongo.')
  return registry
}

export function getNfzDatabaseConnection(app: any, name?: string): NfzDatabaseConnectionHandle {
  const handle = getNfzDatabaseRegistry(app).get(name)
  if (handle.state !== 'ready')
    throw new Error(`Database connection '${handle.name}' is not ready (state=${handle.state}).`)
  return handle
}

export async function getNfzMongoDatabase(app: any, name?: string): Promise<Db> {
  const handle = getNfzDatabaseConnection(app, name)
  if (handle.type !== 'mongodb' || !handle.database)
    throw new Error(`Database connection '${handle.name}' is not a MongoDB connection.`)
  return handle.database
}

export function getNfzKnexClient(app: any, name?: string): any {
  const handle = getNfzDatabaseConnection(app, name)
  if (handle.type === 'mongodb')
    throw new Error(`Database connection '${handle.name}' is not a Knex/SQL connection.`)
  return handle.client
}

export function getNfzDatabaseDiagnostics(app: any): NfzDatabaseConnectionDiagnostics[] {
  return getNfzDatabaseRegistry(app).diagnostics()
}

export async function checkNfzDatabaseConnection(
  app: any,
  name?: string,
): Promise<NfzDatabaseConnectionDiagnostics> {
  return getNfzDatabaseRegistry(app).check(name)
}
