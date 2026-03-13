import { describe, expect, it } from 'vitest'

import { resolveMongoOptions } from './mongodb'

describe('resolveMongoOptions', () => {
  it('should apply management defaults', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
    })

    expect(result.management).toEqual({
      enabled: false,
      auth: true,
      exposeDatabasesService: true,
      exposeCollectionsService: true,
      exposeUsersService: false,
      exposeCollectionCrud: true,
      basePath: '/mongo',
    })
  })

  it('should normalize custom management options', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
      management: {
        enabled: true,
        auth: false,
        basePath: 'admin-mongo',
        exposeUsersService: true,
        exposeCollectionCrud: false,
      },
    })

    expect(result.management.enabled).toBe(true)
    expect(result.management.auth).toBe(false)
    expect(result.management.basePath).toBe('/admin-mongo')
    expect(result.management.exposeUsersService).toBe(true)
    expect(result.management.exposeCollectionCrud).toBe(false)
  })

  it('should keep users service opt-in', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
      management: {
        enabled: true,
        exposeUsersService: true,
      },
    })

    expect(result.management.exposeUsersService).toBe(true)
  })
})
