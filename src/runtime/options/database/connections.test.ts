import { describe, expect, it } from 'vitest'
import { resolveDataBaseOptions } from './index'

describe('named database connection options', () => {
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
      legacy: true,
      url: 'mongodb://localhost:27017/legacy',
    })
    expect(resolved.connections.default?.type === 'mongodb' && resolved.connections.default.management.basePath).toBe('/mongo')
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
