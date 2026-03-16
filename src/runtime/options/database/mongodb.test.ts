import { describe, expect, it } from 'vitest'

import { getMongoManagementRoutes, normalizeMongoManagementBasePath, resolveMongoOptions } from './mongodb'

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

  it('should harden and trim the management basePath', () => {
    expect(normalizeMongoManagementBasePath(' mongo/admin/ ')).toBe('/mongo/admin')
    expect(normalizeMongoManagementBasePath('///mongo///admin///')).toBe('/mongo/admin')
    expect(normalizeMongoManagementBasePath('')).toBe('/mongo')
  })

  it('should derive the public route surface from resolved management options', () => {
    const routes = getMongoManagementRoutes({
      enabled: true,
      basePath: '/mongo-admin',
      exposeDatabasesService: true,
      exposeCollectionsService: true,
      exposeUsersService: false,
      exposeCollectionCrud: true,
    })

    expect(routes.map(route => route.path)).toEqual([
      '/mongo-admin/databases',
      '/mongo-admin/:db/collections',
      '/mongo-admin/:db/stats',
      '/mongo-admin/:db/:collection/indexes',
      '/mongo-admin/:db/:collection/count',
      '/mongo-admin/:db/:collection/schema',
      '/mongo-admin/:db/:collection/documents',
      '/mongo-admin/:db/:collection/aggregate',
    ])
  })

  it('should not expose routes when management is disabled', () => {
    expect(getMongoManagementRoutes({
      enabled: false,
      basePath: '/mongo',
      exposeDatabasesService: true,
      exposeCollectionsService: true,
      exposeUsersService: true,
      exposeCollectionCrud: true,
    })).toEqual([])
  })
})
