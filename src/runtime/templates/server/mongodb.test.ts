import { describe, expect, it } from 'vitest'
import ts from 'typescript'

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
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '
'),
    )

    expect(messages).toEqual([])
    expect(code).toContain("replace(/^\//, '')")
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
})
