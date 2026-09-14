import type { NfzDatabaseRegistryDependencies } from './database-registry'
import { describe, expect, it, vi } from 'vitest'
import { resolveDataBaseOptions } from '../options/database'
import {
  checkNfzDatabaseConnection,
  createDatabaseInfrastructure,
  getNfzDatabaseDiagnostics,
  getNfzKnexClient,
  getNfzMongoDatabase,
  withNfzSqlTransaction,
} from './database-registry'

function createApp() {
  const values = new Map<string, unknown>()
  return {
    set(key: string, value: unknown) {
      values.set(key, value)
    },
    get(key: string) {
      return values.get(key)
    },
    service() {
      throw new Error('service not registered')
    },
    use() {},
  }
}

describe('database registry', () => {
  it('connects named MongoDB and SQL resources, preserves aliases and closes in reverse order', async () => {
    const closeOrder: string[] = []
    const mongoDatabase = { command: vi.fn() } as any
    const knexClient = { raw: vi.fn() }
    const dependencies: NfzDatabaseRegistryDependencies = {
      connectMongo: async ({ name }) => ({
        client: { name },
        database: mongoDatabase,
        databaseName: 'application',
        close: async () => { closeOrder.push(name) },
        healthCheck: async () => {},
      }),
      connectKnex: async ({ name }) => ({
        client: knexClient,
        close: async () => { closeOrder.push(name) },
        healthCheck: async () => {},
      }),
    }
    const config = resolveDataBaseOptions({
      default: 'primary',
      connections: {
        primary: {
          type: 'mongodb',
          url: 'mongodb://admin:secret@localhost/application',
          management: { enabled: false },
        },
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://reporter:secret@localhost/reporting',
        },
      },
    })
    const app = createApp()

    await createDatabaseInfrastructure(dependencies)(app, config)

    await expect(getNfzMongoDatabase(app, 'primary')).resolves.toBe(mongoDatabase)
    expect(getNfzKnexClient(app, 'reporting')).toBe(knexClient)
    expect(app.get('mongodbDb')).toBe(mongoDatabase)
    expect(app.get('database_ok')).toBe(true)

    const diagnostics = getNfzDatabaseDiagnostics(app)
    expect(diagnostics).toHaveLength(2)
    expect(JSON.stringify(diagnostics)).not.toContain('secret')
    expect(diagnostics.map(item => item.state)).toEqual(['ready', 'ready'])
    expect(diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'primary', provider: 'mongodb', databaseFamily: 'document', certification: 'certified' }),
      expect.objectContaining({
        name: 'reporting',
        provider: 'knex',
        databaseFamily: 'sql',
        certification: 'certified',
        defaultClient: 'pg',
        driverPackage: 'pg',
        customClient: false,
      }),
    ]))

    await checkNfzDatabaseConnection(app, 'reporting')
    await (app.get('databaseRegistry') as any).closeAll()
    expect(closeOrder).toEqual(['reporting', 'primary'])
  })

  it('runs a transaction on one ready SQL connection and rejects non-SQL targets', async () => {
    const transaction = vi.fn(async (handler: (trx: { marker: string }) => Promise<string>) => {
      return handler({ marker: 'transaction' })
    })
    const config = resolveDataBaseOptions({
      default: 'reporting',
      connections: {
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://localhost/reporting',
        },
        documents: {
          type: 'mongodb',
          url: 'mongodb://localhost/documents',
          management: { enabled: false },
        },
      },
    })
    const app = createApp()

    await createDatabaseInfrastructure({
      connectKnex: async () => ({
        client: { transaction },
        close: async () => {},
        healthCheck: async () => {},
      }),
      connectMongo: async () => ({
        client: {},
        database: { command: vi.fn() } as any,
        databaseName: 'documents',
        close: async () => {},
        healthCheck: async () => {},
      }),
    })(app, config)

    await expect(withNfzSqlTransaction<string, { marker: string }>(
      app,
      async trx => trx.marker,
      { connection: 'reporting' },
    )).resolves.toBe('transaction')
    expect(transaction).toHaveBeenCalledOnce()

    await expect(withNfzSqlTransaction(
      app,
      async () => 'never',
      { connection: 'documents' },
    )).rejects.toThrow(/does not support the NFZ SQL transaction helper/)
  })

  it('keeps an optional failed connection visible without blocking startup', async () => {
    const config = resolveDataBaseOptions({
      connections: {
        optional: {
          type: 'postgresql',
          connection: 'postgresql://user:secret@localhost/missing',
          required: false,
        },
      },
    })
    const app = createApp()

    await createDatabaseInfrastructure({
      connectKnex: async () => {
        throw new Error('sqlserver://user:secret@localhost/missing password=secret token=top-secret')
      },
    })(app, config)

    expect(app.get('database_ok')).toBe(true)
    expect(getNfzDatabaseDiagnostics(app)[0]).toMatchObject({
      name: 'optional',
      state: 'failed',
      required: false,
      error: { message: expect.not.stringContaining('secret') },
    })
    expect(JSON.stringify(getNfzDatabaseDiagnostics(app))).not.toContain('sqlserver://')
    expect(JSON.stringify(getNfzDatabaseDiagnostics(app))).not.toContain('top-secret')
  })

  it('rolls back opened connections when a required connection fails', async () => {
    const closeOrder: string[] = []
    const config = resolveDataBaseOptions({
      connections: {
        primary: {
          type: 'postgresql',
          connection: 'postgresql://localhost/primary',
        },
        requiredFailure: {
          type: 'mysql',
          connection: 'mysql://localhost/failure',
        },
      },
    })
    const app = createApp()

    await expect(createDatabaseInfrastructure({
      connectKnex: async ({ name }) => {
        if (name === 'requiredFailure')
          throw new Error('connection refused')
        return {
          client: { name },
          close: async () => { closeOrder.push(name) },
          healthCheck: async () => {},
        }
      },
    })(app, config)).rejects.toThrow('Required database connection \'requiredFailure\' failed')

    expect(closeOrder).toEqual(['primary'])
    const registry = app.get('databaseRegistry') as any
    expect(registry.connections.get('primary').state).toBe('closed')
    expect(registry.connections.get('requiredFailure').state).toBe('failed')
  })

  it('closes a connected client when its initial health check fails', async () => {
    const close = vi.fn(async () => {})
    const config = resolveDataBaseOptions({
      connections: {
        optional: {
          type: 'sqlite',
          connection: { filename: ':memory:' },
          required: false,
        },
      },
    })
    const app = createApp()

    await createDatabaseInfrastructure({
      connectKnex: async () => ({
        client: { driver: 'sqlite' },
        close,
        healthCheck: async () => { throw new Error('health check failed') },
      }),
    })(app, config)

    expect(close).toHaveBeenCalledOnce()
    expect(getNfzDatabaseDiagnostics(app)[0]).toMatchObject({
      state: 'failed',
      connected: false,
    })
    await (app.get('databaseRegistry') as any).closeAll()
    expect(close).toHaveBeenCalledOnce()
  })
})
