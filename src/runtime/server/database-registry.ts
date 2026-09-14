import type { Db } from 'mongodb'
import type {
  ResolvedDataBaseOptions,
  ResolvedKnexDatabaseConnectionOptions,
  ResolvedMongoDatabaseConnectionOptions,
  ResolvedNfzDatabaseConnectionOptions,
} from '../options/database'

import { MongoClient as MongoClientConstructor } from 'mongodb'
import { registerMongoManagementServices } from './mongodb'
import { connectNfzSqlProvider, isNfzSqlTransactionClient } from './sql-provider'

export type NfzDatabaseConnectionState = 'idle' | 'connecting' | 'ready' | 'failed' | 'closed'

export interface NfzDatabaseConnectionDiagnostics {
  name: string
  type: ResolvedNfzDatabaseConnectionOptions['type']
  provider: ResolvedNfzDatabaseConnectionOptions['provider']
  databaseFamily: ResolvedNfzDatabaseConnectionOptions['databaseFamily']
  adapter: ResolvedNfzDatabaseConnectionOptions['adapter']
  certification: ResolvedNfzDatabaseConnectionOptions['certification']
  capabilities: ResolvedNfzDatabaseConnectionOptions['capabilities']
  defaultClient?: string
  driverPackage?: string
  customClient?: boolean
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
  provider: ResolvedNfzDatabaseConnectionOptions['provider']
  databaseFamily: ResolvedNfzDatabaseConnectionOptions['databaseFamily']
  adapter: ResolvedNfzDatabaseConnectionOptions['adapter']
  certification: ResolvedNfzDatabaseConnectionOptions['certification']
  capabilities: ResolvedNfzDatabaseConnectionOptions['capabilities']
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
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s'"`]+/gi, '[redacted-database-url]')
    .replace(/((?:password|passwd|pwd|secret|token)\s*[=:]\s*)[^\s,;]+/gi, '$1[redacted]')
    .replace(/(["']?(?:password|passwd|pwd|secret|token)["']?\s*:\s*)["'][^"']*["']/gi, '$1"[redacted]"')

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
    provider: _provider,
    databaseFamily: _databaseFamily,
    adapter: _adapter,
    certification: _certification,
    capabilities: _capabilities,
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

async function defaultConnectKnex(
  { config }: NfzDatabaseConnectorContext & { config: ResolvedKnexDatabaseConnectionOptions },
): Promise<NfzDatabaseConnectorResult> {
  return connectNfzSqlProvider(config)
}

function toDiagnostics(
  handle: NfzDatabaseConnectionHandle,
  defaultConnection?: string,
): NfzDatabaseConnectionDiagnostics {
  return {
    name: handle.name,
    type: handle.type,
    provider: handle.provider,
    databaseFamily: handle.databaseFamily,
    adapter: handle.adapter,
    certification: handle.certification,
    capabilities: { ...handle.capabilities },
    ...(handle.config.provider === 'knex'
      ? {
          defaultClient: handle.config.defaultClient,
          driverPackage: handle.config.driverPackage,
          customClient: handle.config.customClient,
        }
      : {}),
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
      provider: connectionConfig.provider,
      databaseFamily: connectionConfig.databaseFamily,
      adapter: connectionConfig.adapter,
      certification: connectionConfig.certification,
      capabilities: { ...connectionConfig.capabilities },
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
      const connectionConfig = handle.config
      if (connectionConfig.provider === 'mongodb') {
        result = await (dependencies.connectMongo || defaultConnectMongo)({
          name: handle.name,
          config: connectionConfig,
        })
      }
      else if (connectionConfig.provider === 'knex') {
        result = await (dependencies.connectKnex || defaultConnectKnex)({
          name: handle.name,
          config: connectionConfig,
        })
      }
      else {
        throw new Error(`Database provider '${String(handle.provider)}' is not supported by this NFZ runtime.`)
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
  if (handle.config.provider !== 'knex')
    throw new Error(`Database connection '${handle.name}' is not a Knex/SQL connection.`)
  return handle.client
}

export async function withNfzSqlTransaction<TResult, TTransaction = unknown>(
  app: any,
  handler: (transaction: TTransaction) => Promise<TResult>,
  options: { connection?: string } = {},
): Promise<TResult> {
  const handle = getNfzDatabaseConnection(app, options.connection)
  if (handle.config.provider !== 'knex') {
    throw new Error(
      `Database connection '${handle.name}' does not support the NFZ SQL transaction helper.`,
    )
  }
  if (!handle.capabilities.transactions) {
    throw new Error(
      `Database connection '${handle.name}' does not advertise transactional capability.`,
    )
  }
  if (!isNfzSqlTransactionClient(handle.client)) {
    throw new Error(
      `Database connection '${handle.name}' does not expose a Knex transaction() runtime.`,
    )
  }
  return handle.client.transaction<TTransaction, TResult>(handler)
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
