import type { MongoClientOptions } from 'mongodb'

import { authenticate } from '@feathersjs/authentication'
import { MongoClient } from 'mongodb'
import {
  aggregate,
  collections,
  count,
  database,
  documents,
  indexes,
  requireMongoAdmin,
  schema,
  stats,
  users,
} from 'feathers-mongodb-management-ts'

export interface NfzMongoAuditOptions {
  enabled?: boolean
}

export interface NfzMongoAuthOptions {
  enabled?: boolean
  authenticate?: boolean
  authStrategies?: string[]
  userProperty?: string
  adminField?: string
  adminRoleNames?: string[]
  rolesField?: string
  permissionsField?: string
  requiredPermissions?: string[]
  requiredScopes?: string[]
  scopeField?: string
}

export interface NfzMongoManagementConfig {
  enabled?: boolean
  basePath?: string
  exposeDatabasesService?: boolean
  exposeCollectionsService?: boolean
  exposeUsersService?: boolean
  exposeCollectionCrud?: boolean
  whitelistDatabases?: string[]
  blacklistDatabases?: string[]
  whitelistCollections?: string[]
  blacklistCollections?: string[]
  showSystemDatabases?: boolean
  allowCreateDatabase?: boolean
  allowDropDatabase?: boolean
  allowCreateCollection?: boolean
  allowDropCollection?: boolean
  allowInsertDocuments?: boolean
  allowPatchDocuments?: boolean
  allowReplaceDocuments?: boolean
  allowRemoveDocuments?: boolean
  audit?: NfzMongoAuditOptions
  auth?: NfzMongoAuthOptions
}

export interface NfzMongoInfrastructureConfig {
  mongodbConnection: string | null | undefined
  mongodbOptions?: MongoClientOptions
  management?: NfzMongoManagementConfig
}

function ensureLeadingSlash(value: unknown): string {
  const input = String(value || '').trim()
  if (!input)
    return '/'
  return input.startsWith('/') ? input : `/${input}`
}

function stripEdgeSlashes(value: string): string {
  let result = String(value || '')
  while (result.startsWith('/')) result = result.slice(1)
  while (result.endsWith('/')) result = result.slice(0, -1)
  return result
}

function normalizePath(...parts: unknown[]): string {
  const normalized = parts
    .filter(part => part != null && String(part).trim() !== '')
    .map(part => stripEdgeSlashes(String(part)))
    .filter(Boolean)
    .join('/')

  return normalized ? `/${normalized}` : '/'
}

function hasService(app: any, path: string): boolean {
  const normalized = String(path || '').replace(/^\//, '')
  return Object.prototype.hasOwnProperty.call(app.services || {}, normalized)
}

function resolveMongoAdminUser(management: NfzMongoManagementConfig, params: any): any {
  const userProperty = management.auth?.userProperty || 'user'
  return params?.[userProperty]
}

function normalizeAuthStrategies(value: unknown): string[] {
  if (!Array.isArray(value))
    return ['jwt']

  const strategies = value
    .map(item => String(item || '').trim())
    .filter(Boolean)

  return strategies.length ? strategies : ['jwt']
}

function createMongoAdminBeforeHooks(authOptions?: NfzMongoAuthOptions): Array<(context: any) => unknown> {
  if (!authOptions)
    return []

  const hooks: Array<(context: any) => unknown> = []

  if (authOptions.authenticate !== false) {
    const strategies = normalizeAuthStrategies(authOptions.authStrategies)
    const authHook = authenticate(...(strategies as [string, ...string[]]))
    hooks.push(authHook)
  }

  hooks.push(requireMongoAdmin(authOptions))
  return hooks
}

function createAuditLogger(management: NfzMongoManagementConfig): { enabled: true, logger: (entry: unknown) => void, resolveUser: (params: any) => unknown } | undefined {
  if (!management.audit?.enabled)
    return undefined

  return {
    enabled: true,
    logger(entry: unknown) {
      console.info('[NFZ mongo-admin]', JSON.stringify(entry))
    },
    resolveUser(params: any) {
      const user = resolveMongoAdminUser(management, params)
      return user?.email || user?.userId || user?._id || user?.id || undefined
    },
  }
}

function createAuthOptions(management: NfzMongoManagementConfig): NfzMongoAuthOptions | undefined {
  if (!management.auth?.enabled)
    return undefined

  return {
    authenticate: management.auth.authenticate !== false,
    authStrategies: normalizeAuthStrategies(management.auth.authStrategies),
    userProperty: management.auth.userProperty || 'user',
    adminField: management.auth.adminField || 'isAdmin',
    adminRoleNames: Array.isArray(management.auth.adminRoleNames) && management.auth.adminRoleNames.length ? management.auth.adminRoleNames : ['admin'],
    rolesField: management.auth.rolesField || 'roles',
    permissionsField: management.auth.permissionsField || 'permissions',
    requiredPermissions: Array.isArray(management.auth.requiredPermissions) ? management.auth.requiredPermissions : [],
    requiredScopes: Array.isArray(management.auth.requiredScopes) ? management.auth.requiredScopes : [],
    scopeField: management.auth.scopeField || 'scope',
  }
}

function inferDatabaseName(connection: string): string {
  try {
    const parsed = new URL(connection)
    const pathname = String(parsed.pathname || '').replace(/^\//, '')
    return pathname || 'test'
  }
  catch {
    return 'test'
  }
}

export function createMongoInfrastructure(config: NfzMongoInfrastructureConfig) {
  const mongodbConnection = config.mongodbConnection
  const mongodbOptions = config.mongodbOptions || {}
  const management: NfzMongoManagementConfig = config.management || {}

  return async function mongodb(app: any): Promise<void> {
    const connection = app.get('mongodb') || mongodbConnection
    const defaultMongoPath = ensureLeadingSlash(management.basePath || '/mongo')
    const configuredMongoPath = app.get('mongoPath')
    const mongoPath = ensureLeadingSlash(configuredMongoPath || defaultMongoPath)

    if (!configuredMongoPath)
      app.set('mongoPath', mongoPath)

    if (!connection || typeof connection !== 'string')
      throw new Error('Missing MongoDB connection string in app.get("mongodb")')

    const client = await MongoClient.connect(connection, mongodbOptions)
    const databaseName = inferDatabaseName(connection)
    const db = client.db(databaseName)

    app.set('mongodbClient', Promise.resolve(db))
    app.set('mongodbDb', db)
    app.set('mongodbConnection', client)
    app.set('currentDatabase', databaseName)
    app.set('mongodb_ok', true)

    if (!management.enabled)
      return

    const baseOptions = {
      db,
      whitelistDatabases: Array.isArray(management.whitelistDatabases) && management.whitelistDatabases.length ? management.whitelistDatabases : undefined,
      blacklistDatabases: Array.isArray(management.blacklistDatabases) && management.blacklistDatabases.length
        ? management.blacklistDatabases
        : management.showSystemDatabases === true
          ? undefined
          : ['admin', 'config', 'local'],
      whitelistCollections: Array.isArray(management.whitelistCollections) && management.whitelistCollections.length ? management.whitelistCollections : undefined,
      blacklistCollections: Array.isArray(management.blacklistCollections) && management.blacklistCollections.length ? management.blacklistCollections : ['system.profile'],
      allowCreateDatabase: management.allowCreateDatabase === true,
      allowDropDatabase: management.allowDropDatabase === true,
      allowCreateCollection: management.allowCreateCollection === true,
      allowDropCollection: management.allowDropCollection === true,
      allowInsertDocuments: management.allowInsertDocuments === true,
      allowPatchDocuments: management.allowPatchDocuments === true,
      allowReplaceDocuments: management.allowReplaceDocuments === true,
      allowRemoveDocuments: management.allowRemoveDocuments === true,
      audit: createAuditLogger(management),
      auth: createAuthOptions(management),
    }

    const mount = (path: string, factory: (options: any) => (app: any) => unknown, specificOptions: Record<string, unknown> = {}) => {
      if (hasService(app, path))
        return

      const serviceOptions = { ...baseOptions, ...specificOptions, serviceName: path }
      app.configure(factory(serviceOptions))

      const beforeAllHooks = createMongoAdminBeforeHooks(serviceOptions.auth)
      if (beforeAllHooks.length > 0) {
        try {
          app.service(path).hooks({ before: { all: beforeAllHooks } })
        }
        catch {
          // ignore late service adapters
        }
      }
    }

    if (management.exposeDatabasesService)
      mount(normalizePath(mongoPath, 'databases'), database)

    if (management.exposeCollectionsService)
      mount(normalizePath(mongoPath, ':db', 'collections'), collections)

    if (management.exposeUsersService)
      mount(normalizePath(mongoPath, 'users'), users, { hasUserInfosCommand: true })

    if (management.exposeCollectionCrud) {
      mount(normalizePath(mongoPath, ':db', 'stats'), stats)
      mount(normalizePath(mongoPath, ':db', ':collection', 'indexes'), indexes)
      mount(normalizePath(mongoPath, ':db', ':collection', 'count'), count)
      mount(normalizePath(mongoPath, ':db', ':collection', 'schema'), schema, { sampleSize: 50 })
      mount(normalizePath(mongoPath, ':db', ':collection', 'documents'), documents)
      mount(normalizePath(mongoPath, ':db', ':collection', 'aggregate'), aggregate, {
        maxPipelineStages: 20,
        maxResultSize: 100,
      })
    }
  }
}
