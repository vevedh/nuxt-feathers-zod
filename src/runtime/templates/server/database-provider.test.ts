import { describe, expect, it } from 'vitest'
import { resolveDataBaseOptions } from '../../options/database'
import { getServerDtsContents } from './server-dts'
import { getServerValidatorContents } from './validators'

function resolvedOptionsWithDatabase(database: ReturnType<typeof resolveDataBaseOptions>) {
  return {
    database,
    validator: { formats: [] },
    transports: { rest: false },
    auth: false,
  } as any
}

describe('database-aware server templates', () => {
  it('enables MongoDB validator and Db typing for named Mongo connections', () => {
    const database = resolveDataBaseOptions({
      connections: {
        archive: {
          type: 'mongodb',
          url: 'mongodb://localhost:27017/archive',
          management: { enabled: false },
        },
      },
    })
    const options = resolvedOptionsWithDatabase(database)

    expect(getServerValidatorContents(options)()).toContain("keywordObjectId")
    expect(getServerDtsContents(options)()).toContain("import type { Db } from 'mongodb'")
  })

  it('does not emit MongoDB-only helpers for SQL-only registries', () => {
    const database = resolveDataBaseOptions({
      connections: {
        reporting: {
          type: 'postgresql',
          connection: 'postgresql://localhost/reporting',
        },
      },
    })
    const options = resolvedOptionsWithDatabase(database)

    expect(getServerValidatorContents(options)()).not.toContain('keywordObjectId')
    expect(getServerDtsContents(options)()).not.toContain("import type { Db } from 'mongodb'")
  })
})
