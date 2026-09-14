import { describe, expect, it } from 'vitest'
import { resolveDataBaseOptions } from '../options/database'
import { assertNfzSqlDriverAvailable, buildNfzKnexRuntimeConfig, isNfzSqlTransactionClient } from './sql-provider'

describe('relational SQL provider foundation', () => {
  it('builds a sanitized Knex runtime configuration from normalized SQL options', () => {
    const resolved = resolveDataBaseOptions({
      connections: {
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://localhost/reporting',
          pool: {
            min: 0,
            max: 7,
            idleTimeoutMillis: 30_000,
          },
          acquireConnectionTimeout: 12_000,
          searchPath: ['public', 'audit', 'public'],
        },
      },
    })
    const reporting = resolved.connections.reporting
    if (reporting?.provider !== 'knex')
      throw new Error('Expected reporting to resolve as a Knex connection')

    expect(buildNfzKnexRuntimeConfig(reporting)).toEqual({
      client: 'pg',
      connection: 'postgresql://localhost/reporting',
      pool: {
        min: 0,
        max: 7,
        idleTimeoutMillis: 30_000,
      },
      acquireConnectionTimeout: 12_000,
      searchPath: ['public', 'audit'],
    })
  })

  it('fails closed before Knex startup when the declared SQL driver package is missing', () => {
    const resolved = resolveDataBaseOptions({
      connections: {
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://localhost/reporting',
        },
      },
    })
    const reporting = resolved.connections.reporting
    if (reporting?.provider !== 'knex')
      throw new Error('Expected reporting to resolve as a Knex connection')

    expect(() => assertNfzSqlDriverAvailable({
      ...reporting,
      driverPackage: 'nfz-patch063-deliberately-missing-sql-driver',
    })).toThrow(/requires SQL driver package/)
  })

  it('detects transaction-capable SQL clients structurally', () => {
    expect(isNfzSqlTransactionClient({ transaction: async () => undefined })).toBe(true)
    expect(isNfzSqlTransactionClient({ raw: async () => undefined })).toBe(false)
    expect(isNfzSqlTransactionClient(undefined)).toBe(false)
  })
})
