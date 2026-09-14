import type { ResolvedKnexDatabaseConnectionOptions } from '../options/database'

import { createRequire } from 'node:module'

export interface NfzSqlTransactionClient {
  transaction<TTransaction = unknown, TResult = unknown>(
    handler: (transaction: TTransaction) => Promise<TResult>,
  ): Promise<TResult>
}

export interface NfzSqlConnectorResult {
  client: unknown
  close(): Promise<void>
  healthCheck(): Promise<void>
}

type KnexFactory = (config: Record<string, unknown>) => unknown

function loadPackage(packageName: string): unknown {
  const require = createRequire(import.meta.url)
  try {
    return require(packageName)
  }
  catch (error) {
    throw new Error(
      `SQL runtime package '${packageName}' is required but is not installed. `
      + 'Install @feathersjs/knex, knex and the driver declared by the selected NFZ database provider.',
      { cause: error },
    )
  }
}

function loadKnexFactory(): KnexFactory {
  const module = loadPackage('knex') as { default?: unknown, knex?: unknown } | KnexFactory
  const factory = typeof module === 'function'
    ? module
    : module.default || module.knex

  if (typeof factory !== 'function')
    throw new TypeError('The knex package did not expose a callable factory.')

  return factory as KnexFactory
}

export function assertNfzSqlDriverAvailable(config: ResolvedKnexDatabaseConnectionOptions): void {
  const require = createRequire(import.meta.url)
  try {
    require.resolve(config.driverPackage)
  }
  catch (error) {
    throw new Error(
      `Database connection '${config.name}' (${config.type}) requires SQL driver package '${config.driverPackage}'. `
      + `Install it together with @feathersjs/knex and knex before starting NFZ.`,
      { cause: error },
    )
  }
}

export function buildNfzKnexRuntimeConfig(config: ResolvedKnexDatabaseConnectionOptions): Record<string, unknown> {
  return {
    client: config.client,
    connection: config.connection,
    pool: { ...config.pool },
    acquireConnectionTimeout: config.acquireConnectionTimeout,
    ...(config.useNullAsDefault != null ? { useNullAsDefault: config.useNullAsDefault } : {}),
    ...(config.searchPath?.length ? { searchPath: [...config.searchPath] } : {}),
  }
}

function isObjectLike(value: unknown): value is Record<PropertyKey, unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

export function isNfzSqlTransactionClient(value: unknown): value is NfzSqlTransactionClient {
  return isObjectLike(value) && typeof value.transaction === 'function'
}

export async function connectNfzSqlProvider(
  config: ResolvedKnexDatabaseConnectionOptions,
): Promise<NfzSqlConnectorResult> {
  assertNfzSqlDriverAvailable(config)
  const knexFactory = loadKnexFactory()
  const client = knexFactory(buildNfzKnexRuntimeConfig(config))

  if (!isObjectLike(client))
    throw new TypeError(`Knex did not return a usable SQL client for database connection '${config.name}'.`)

  const destroy = client.destroy
  const raw = client.raw
  if (typeof destroy !== 'function' || typeof raw !== 'function') {
    throw new TypeError(
      `Knex client for database connection '${config.name}' does not expose the required raw()/destroy() lifecycle methods.`,
    )
  }

  return {
    client,
    async close() {
      await destroy.call(client)
    },
    async healthCheck() {
      await raw.call(client, 'select 1 as nfz_health')
    },
  }
}
