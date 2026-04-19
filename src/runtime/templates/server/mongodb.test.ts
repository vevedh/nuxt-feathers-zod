import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { getServerMongodbContents } from './mongodb'

describe('server mongodb template', () => {
  it('should generate valid TypeScript when mongo management is enabled', () => {
    const code = getServerMongodbContents({
      database: {
        mongo: {
          url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
          management: {
            enabled: true,
            auth: {
              enabled: true,
              authenticate: true,
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
            blacklistDatabases: ['admin', 'config', 'local'],
            showSystemDatabases: false,
            whitelistCollections: [],
            blacklistCollections: ['system.profile'],
            allowCreateDatabase: false,
            allowDropDatabase: false,
            allowCreateCollection: false,
            allowDropCollection: false,
            allowInsertDocuments: false,
            allowPatchDocuments: false,
            allowReplaceDocuments: false,
            allowRemoveDocuments: false,
          },
        },
      },
    } as any)()

    const transpiled = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
      fileName: '.nuxt/feathers/server/mongodb.ts',
      reportDiagnostics: true,
    })

    const messages = (transpiled.diagnostics ?? []).map((diagnostic: ts.Diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )

    expect(messages).toEqual([])
    expect(code).toContain('replace(/^\//, \'\')')
  })

  it('should allow system databases when showSystemDatabases is enabled', () => {
    const code = getServerMongodbContents({
      database: {
        mongo: {
          url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
          management: {
            enabled: true,
            auth: { enabled: false, authenticate: false },
            audit: { enabled: false },
            exposeDatabasesService: true,
            exposeCollectionsService: true,
            exposeUsersService: false,
            exposeCollectionCrud: true,
            basePath: '/mongo',
            whitelistDatabases: [],
            blacklistDatabases: [],
            showSystemDatabases: true,
            whitelistCollections: [],
            blacklistCollections: ['system.profile'],
            allowCreateDatabase: false,
            allowDropDatabase: false,
            allowCreateCollection: true,
            allowDropCollection: true,
            allowInsertDocuments: false,
            allowPatchDocuments: false,
            allowReplaceDocuments: false,
            allowRemoveDocuments: false,
          },
        },
      },
    } as any)()

    expect(code).toContain('management.showSystemDatabases === true')
    expect(code).toContain('allowCreateCollection: management.allowCreateCollection === true')
    expect(code).toContain('allowDropCollection: management.allowDropCollection === true')
  })

  it('should forward the full Mongo management write surface for databases, collections and documents', () => {
    const code = getServerMongodbContents({
      database: {
        mongo: {
          url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
          management: {
            enabled: true,
            auth: { enabled: false, authenticate: false },
            audit: { enabled: false },
            exposeDatabasesService: true,
            exposeCollectionsService: true,
            exposeUsersService: false,
            exposeCollectionCrud: true,
            basePath: '/mongo',
            whitelistDatabases: [],
            blacklistDatabases: [],
            showSystemDatabases: true,
            whitelistCollections: [],
            blacklistCollections: [],
            allowCreateDatabase: true,
            allowDropDatabase: true,
            allowCreateCollection: true,
            allowDropCollection: true,
            allowInsertDocuments: true,
            allowPatchDocuments: true,
            allowReplaceDocuments: true,
            allowRemoveDocuments: true,
          },
        },
      },
    } as any)()

    expect(code).toContain('allowCreateDatabase: management.allowCreateDatabase === true')
    expect(code).toContain('allowDropDatabase: management.allowDropDatabase === true')
    expect(code).toContain('allowCreateCollection: management.allowCreateCollection === true')
    expect(code).toContain('allowDropCollection: management.allowDropCollection === true')
    expect(code).toContain('allowInsertDocuments: management.allowInsertDocuments === true')
    expect(code).toContain('allowPatchDocuments: management.allowPatchDocuments === true')
    expect(code).toContain('allowReplaceDocuments: management.allowReplaceDocuments === true')
    expect(code).toContain('allowRemoveDocuments: management.allowRemoveDocuments === true')
  })

  it('should align audit user resolution with auth.userProperty and preserve mongodbClient as Promise<Db>', () => {
    const code = getServerMongodbContents({
      database: {
        mongo: {
          url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
          management: {
            enabled: true,
            auth: {
              enabled: true,
              authenticate: true,
              userProperty: 'account',
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
            exposeCollectionCrud: false,
            basePath: '/mongo-admin',
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
          },
        },
      },
    } as any)()

    expect(code).toContain("const userProperty = management.auth?.userProperty || 'user'")
    expect(code).toContain("const user = resolveMongoAdminUser(params)")
    expect(code).toContain("return user?.email || user?.userId || user?._id || user?.id || undefined")
    expect(code).toContain("app.set('mongodbClient', Promise.resolve(db))")
    expect(code).toContain("app.set('mongodbDb', db)")
    expect(code).toContain("app.set('mongodbConnection', client)")
  })

  it('should treat app.get(\'mongoPath\') as the single runtime source of truth and seed it once from management.basePath', () => {
    const code = getServerMongodbContents({
      database: {
        mongo: {
          url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
          management: {
            enabled: true,
            auth: { enabled: false, authenticate: false },
            audit: { enabled: false },
            exposeDatabasesService: true,
            exposeCollectionsService: false,
            exposeUsersService: false,
            exposeCollectionCrud: false,
            basePath: '/mongo-admin/',
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
          },
        },
      },
    } as any)()

    expect(code).toContain("const defaultMongoPath = ensureLeadingSlash(management.basePath || '/mongo')")
    expect(code).toContain("const configuredMongoPath = app.get('mongoPath')")
    expect(code).toContain("const mongoPath = ensureLeadingSlash(configuredMongoPath || defaultMongoPath)")
    expect(code).toContain("if (!configuredMongoPath)")
    expect(code).toContain("app.set('mongoPath', mongoPath)")
  })

  it('should keep Mongo admin auth metadata when authenticate is disabled explicitly', () => {
    const code = getServerMongodbContents({
      database: {
        mongo: {
          url: 'mongodb://root:change-me@127.0.0.1:27017/app/?authSource=admin',
          management: {
            enabled: true,
            auth: {
              enabled: true,
              authenticate: false,
              userProperty: 'account',
              adminField: 'isAdmin',
              adminRoleNames: ['admin'],
              rolesField: 'roles',
              permissionsField: 'permissions',
              requiredPermissions: [],
              requiredScopes: [],
              scopeField: 'scope',
            },
            audit: { enabled: false },
            exposeDatabasesService: true,
            exposeCollectionsService: false,
            exposeUsersService: false,
            exposeCollectionCrud: false,
            basePath: '/mongo-admin',
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
          },
        },
      },
    } as any)()

    expect(code).toContain("if (!management.auth?.enabled)")
    expect(code).toContain("authenticate: management.auth.authenticate !== false")
    expect(code).toContain("app.service(path).hooks({ before: { all: [requireMongoAdmin(baseOptions.auth)] } })")
  })


  it('should mount databases, collections and documents management routes together when enabled', () => {
    const code = getServerMongodbContents({
      database: {
        mongo: {
          url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
          management: {
            enabled: true,
            auth: { enabled: false, authenticate: false },
            audit: { enabled: false },
            exposeDatabasesService: true,
            exposeCollectionsService: true,
            exposeUsersService: false,
            exposeCollectionCrud: true,
            basePath: '/mongo-admin',
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
          },
        },
      },
    } as any)()

    expect(code).toContain('mount(normalizePath(mongoPath, \'databases\'), database)')
    expect(code).toContain('mount(normalizePath(mongoPath, \':db\', \'collections\'), collections)')
    expect(code).toContain('mount(normalizePath(mongoPath, \':db\', \':collection\', \'documents\'), documents)')
  })
})
