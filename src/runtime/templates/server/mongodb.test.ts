import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { getServerMongodbContents } from './mongodb'

function createOptions() {
  return {
    database: {
      mongo: {
        url: 'mongodb://user:private-password@127.0.0.1:27017/app?authSource=admin',
        maxPoolSize: 20,
        management: {
          enabled: true,
          auth: {
            enabled: true,
            authenticate: true,
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
  } as any
}

describe('server mongodb template', () => {
  it('generates valid TypeScript', () => {
    const code = getServerMongodbContents(createOptions())()
    const transpiled = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
      fileName: '.nuxt/feathers/server/mongodb.ts',
      reportDiagnostics: true,
    })

    const messages = (transpiled.diagnostics ?? []).map(diagnostic =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    )
    expect(messages).toEqual([])
  })

  it('does not serialize the MongoDB connection string', () => {
    const code = getServerMongodbContents(createOptions())()

    expect(code).toContain('const mongodbConnection = undefined')
    expect(code).not.toContain('private-password')
    expect(code).not.toContain('mongodb://user')
  })

  it('keeps non-secret client and management options', () => {
    const code = getServerMongodbContents(createOptions())()

    expect(code).toContain('"maxPoolSize": 20')
    expect(code).toContain('"basePath": "/mongo"')
    expect(code).toContain('"exposeCollectionCrud": true')
    expect(code).toContain('createMongoInfrastructure')
  })
})
