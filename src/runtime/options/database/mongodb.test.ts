import { describe, expect, it } from 'vitest'

import { getMongoManagementRoutes, normalizeMongoManagementBasePath, resolveMongoOptions } from './mongodb'

describe('resolveMongoOptions', () => {
  it('should apply management defaults', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
    })

    expect(result.management).toEqual({
      enabled: false,
      auth: {
        enabled: false,
        authenticate: false,
        authStrategies: ['jwt'],
        userProperty: 'user',
        adminField: 'isAdmin',
        adminRoleNames: ['admin'],
        rolesField: 'roles',
        permissionsField: 'permissions',
        requiredPermissions: [],
        requiredScopes: [],
        scopeField: 'scope',
      },
      audit: { enabled: true },
      exposeDatabasesService: true,
      exposeCollectionsService: true,
      exposeUsersService: false,
      exposeCollectionCrud: true,
      basePath: '/mongo',
      whitelistDatabases: [],
      blacklistDatabases: [],
      showSystemDatabases: false,
      whitelistCollections: [],
      blacklistCollections: [],
      allowCreateDatabase: false,
      allowDropDatabase: false,
      allowCreateCollection: false,
      allowDropCollection: false,
      allowInsertDocuments: false,
      allowPatchDocuments: false,
      allowReplaceDocuments: false,
      allowRemoveDocuments: false,
    })
  })


  it('should keep auth defaults inactive when management is disabled implicitly', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
    })

    expect(result.management.enabled).toBe(false)
    expect(result.management.auth.enabled).toBe(false)
    expect(result.management.auth.authenticate).toBe(false)
    expect(result.management.auth.authStrategies).toEqual(['jwt'])
  })

  it('should enable auth defaults automatically when management is enabled without explicit auth config', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
      management: {
        enabled: true,
      },
    })

    expect(result.management.auth.enabled).toBe(true)
    expect(result.management.auth.authenticate).toBe(true)
    expect(result.management.auth.authStrategies).toEqual(['jwt'])
  })

  it('should normalize custom management options', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
      management: {
        enabled: true,
        auth: false,
        audit: false,
        basePath: 'admin-mongo',
        exposeUsersService: true,
        exposeCollectionCrud: false,
      },
    })

    expect(result.management.enabled).toBe(true)
    expect(result.management.auth.enabled).toBe(false)
    expect(result.management.auth.authenticate).toBe(false)
    expect(result.management.audit.enabled).toBe(false)
    expect(result.management.basePath).toBe('/admin-mongo')
    expect(result.management.exposeUsersService).toBe(true)
    expect(result.management.exposeCollectionCrud).toBe(false)
  })

  it('should resolve advanced security and write options', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
      management: {
        enabled: true,
        auth: {
          adminRoleNames: ['admin', 'superadmin'],
          requiredPermissions: ['mongo:admin'],
        },
        whitelistDatabases: ['app'],
        blacklistDatabases: ['admin'],
        whitelistCollections: ['users'],
        blacklistCollections: ['sessions'],
        allowCreateCollection: true,
        allowInsertDocuments: true,
      },
    })

    expect(result.management.auth.adminRoleNames).toEqual(['admin', 'superadmin'])
    expect(result.management.auth.requiredPermissions).toEqual(['mongo:admin'])
    expect(result.management.whitelistDatabases).toEqual(['app'])
    expect(result.management.blacklistDatabases).toEqual(['admin'])
    expect(result.management.whitelistCollections).toEqual(['users'])
    expect(result.management.blacklistCollections).toEqual(['sessions'])
    expect(result.management.allowCreateCollection).toBe(true)
    expect(result.management.allowInsertDocuments).toBe(true)
  })

  it('should allow showing MongoDB system databases explicitly', () => {
    const result = resolveMongoOptions({
      url: 'mongodb://localhost:27017/nfz',
      management: {
        enabled: true,
        showSystemDatabases: true,
      },
    })

    expect(result.management.showSystemDatabases).toBe(true)
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


  it('should default Mongo admin auth strategies to jwt and preserve explicit strategies', () => {
    const defaults = resolveMongoOptions({ url: 'mongodb://localhost:27017/app', management: { enabled: true } as any } as any)
    expect(defaults.management.auth.authStrategies).toEqual(['jwt'])

    const custom = resolveMongoOptions({
      url: 'mongodb://localhost:27017/app',
      management: { enabled: true, auth: { enabled: true, authenticate: true, authStrategies: ['jwt', 'api-key'] } },
    } as any)

    expect(custom.management.auth.authStrategies).toEqual(['jwt', 'api-key'])
  })
})
