import { describe, expect, it } from 'vitest'
import {
  getNfzDatabaseProviderDescriptor,
  hasDatabaseProvider,
  resolveDataBaseOptions,
} from './index'

describe('named database connection options', () => {
  it('resolves provider descriptors and fails closed for unknown engine types', () => {
    expect(getNfzDatabaseProviderDescriptor('mongodb')).toMatchObject({
      provider: 'mongodb',
      databaseFamily: 'document',
      adapter: 'mongodb',
      certification: 'certified',
      capabilities: { nativeObjectId: true, transactions: false },
    })
    expect(getNfzDatabaseProviderDescriptor('postgresql')).toMatchObject({
      provider: 'knex',
      databaseFamily: 'sql',
      adapter: 'knex',
      certification: 'certified',
      defaultClient: 'pg',
      driverPackage: 'pg',
      poolDefaults: { min: 0, max: 10 },
      capabilities: { schemaNamespaces: true, transactions: true },
    })
    expect(() => getNfzDatabaseProviderDescriptor('mssql')).toThrow(/Unsupported database connection type/)
  })

  it('detects named providers without relying on the legacy database.mongo alias', () => {
    const resolved = resolveDataBaseOptions({
      connections: {
        archive: {
          type: 'mongodb',
          url: 'mongodb://localhost:27017/archive',
          management: { enabled: false },
        },
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://localhost/reporting',
        },
      },
    })

    expect(resolved.mongo).toBeUndefined()
    expect(hasDatabaseProvider(resolved, 'mongodb')).toBe(true)
    expect(hasDatabaseProvider(resolved, 'knex')).toBe(true)
    expect(resolved.connections.reporting).toMatchObject({
      provider: 'knex',
      databaseFamily: 'sql',
      defaultClient: 'pg',
      driverPackage: 'pg',
      customClient: false,
      pool: { min: 0, max: 10 },
      acquireConnectionTimeout: 60000,
    })
  })

  it('keeps explicit Knex client overrides observable without changing the certified default', () => {
    const resolved = resolveDataBaseOptions({
      connections: {
        reporting: {
          type: 'postgresql',
          client: 'custom-pg-client',
          driverPackage: '@acme/custom-pg-driver',
          connection: 'postgresql://localhost/reporting',
        },
      },
    })

    expect(resolved.connections.reporting).toMatchObject({
      client: 'custom-pg-client',
      defaultClient: 'pg',
      driverPackage: '@acme/custom-pg-driver',
      customClient: true,
    })
  })

  it('normalizes SQL pool defaults and rejects unsafe pool or custom-driver ambiguity', () => {
    const resolved = resolveDataBaseOptions({
      connections: {
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://localhost/reporting',
        },
        local: {
          type: 'sqlite',
          connection: { filename: ':memory:' },
        },
      },
    })

    expect(resolved.connections.reporting).toMatchObject({
      driverPackage: 'pg',
      pool: { min: 0, max: 10 },
      acquireConnectionTimeout: 60000,
      capabilities: { transactions: true },
    })
    expect(resolved.connections.local).toMatchObject({
      driverPackage: 'better-sqlite3',
      pool: { min: 0, max: 1 },
      acquireConnectionTimeout: 60000,
      capabilities: { transactions: true },
    })

    expect(() => resolveDataBaseOptions({
      connections: {
        unsafeSqlite: {
          type: 'sqlite',
          connection: { filename: './unsafe.sqlite' },
          pool: { min: 0, max: 2 },
        },
      },
    })).toThrow(/SQLite.*pool\.max=1/)

    expect(() => resolveDataBaseOptions({
      connections: {
        invalidPool: {
          type: 'postgresql',
          connection: 'postgresql://localhost/reporting',
          pool: { min: 5, max: 2 },
        },
      },
    })).toThrow(/pool\.min <= pool\.max/)

    expect(() => resolveDataBaseOptions({
      connections: {
        custom: {
          type: 'postgresql',
          client: 'custom-pg-client',
          connection: 'postgresql://localhost/reporting',
        },
      },
    })).toThrow(/must declare driverPackage explicitly/)
  })

  it('maps legacy database.mongo to the default named connection', () => {
    const resolved = resolveDataBaseOptions({
      mongo: {
        url: 'mongodb://localhost:27017/legacy',
        management: { enabled: false },
      },
    })

    expect(resolved.default).toBe('default')
    expect(resolved.connections.default).toMatchObject({
      name: 'default',
      type: 'mongodb',
      databaseFamily: 'document',
      legacy: true,
      url: 'mongodb://localhost:27017/legacy',
    })
    expect(resolved.connections.default?.type === 'mongodb' && resolved.connections.default.management.basePath).toBe('/mongo')
  })

  it('keeps the native MongoDB family option distinct from NFZ databaseFamily metadata', () => {
    const resolved = resolveDataBaseOptions({
      connections: {
        primary: {
          type: 'mongodb',
          url: 'mongodb://localhost:27017/app',
          family: 4,
          management: { enabled: false },
        },
      },
    })
    const primary = resolved.connections.primary

    expect(primary?.type).toBe('mongodb')
    if (primary?.type !== 'mongodb')
      throw new Error('Expected a resolved MongoDB connection')

    expect(primary.family).toBe(4)
    expect(primary.databaseFamily).toBe('document')
  })

  it('resolves MongoDB and SQL connections without exposing an implicit legacy alias', () => {
    const resolved = resolveDataBaseOptions({
      default: 'primary',
      connections: {
        primary: {
          type: 'mongodb',
          url: 'mongodb://localhost:27017/app',
          management: { enabled: false },
        },
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://app:secret@localhost/reporting',
          pool: { min: 1, max: 5 },
        },
        local: {
          type: 'sqlite',
          connection: { filename: './data/local.sqlite' },
          useNullAsDefault: true,
        },
      },
    })

    expect(resolved.default).toBe('primary')
    expect(resolved.mongo).toBeUndefined()
    expect(resolved.connections.primary?.type === 'mongodb' && resolved.connections.primary.management.basePath).toBe('/mongo/primary')
    expect(resolved.connections.reporting).toMatchObject({ type: 'postgresql', client: 'pg' })
    expect(resolved.connections.local).toMatchObject({ type: 'sqlite', client: 'better-sqlite3' })
  })

  it('rejects ambiguous or invalid default connections', () => {
    expect(() => resolveDataBaseOptions({
      mongo: { url: 'mongodb://localhost/legacy' },
      connections: {
        default: { type: 'mongodb', url: 'mongodb://localhost/named' },
      },
    })).toThrow(/cannot be combined/)

    expect(() => resolveDataBaseOptions({
      default: 'missing',
      connections: {
        primary: { type: 'mongodb', url: 'mongodb://localhost/app' },
      },
    })).toThrow(/unknown connection/)
  })

  it('rejects duplicate enabled MongoDB management paths', () => {
    expect(() => resolveDataBaseOptions({
      connections: {
        primary: {
          type: 'mongodb',
          url: 'mongodb://localhost:27017/primary',
          management: { enabled: true, basePath: '/ops/mongo' },
        },
        archive: {
          type: 'mongodb',
          url: 'mongodb://localhost:27017/archive',
          management: { enabled: true, basePath: '/ops/mongo' },
        },
      },
    })).toThrow("MongoDB connections 'primary' and 'archive' expose the same management basePath '/ops/mongo'.")
  })
})
