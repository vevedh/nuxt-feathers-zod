import type { MongoClientOptions } from 'mongodb'

type PickSerializable<T> = {
  // eslint-disable-next-line ts/no-unsafe-function-type
  [K in keyof T as NonNullable<T[K]> extends Function ? never : K]: T[K];
}

interface MongoUrlOption {
  url: string
}

export interface MongoManagementAuthOptions {
  enabled?: boolean
  authenticate?: boolean
  userProperty?: string
  adminField?: string
  adminRoleNames?: string[]
  rolesField?: string
  permissionsField?: string
  requiredPermissions?: string[]
  requiredScopes?: string[]
  scopeField?: string
}

export interface MongoManagementAuditOptions {
  enabled?: boolean
}

export interface MongoManagementOptions {
  enabled?: boolean
  auth?: boolean | MongoManagementAuthOptions
  audit?: boolean | MongoManagementAuditOptions
  exposeDatabasesService?: boolean
  exposeCollectionsService?: boolean
  exposeUsersService?: boolean
  exposeCollectionCrud?: boolean
  basePath?: string
  whitelistDatabases?: string[]
  blacklistDatabases?: string[]
  showSystemDatabases?: boolean
  whitelistCollections?: string[]
  blacklistCollections?: string[]
  allowCreateDatabase?: boolean
  allowDropDatabase?: boolean
  allowCreateCollection?: boolean
  allowDropCollection?: boolean
  allowInsertDocuments?: boolean
  allowPatchDocuments?: boolean
  allowReplaceDocuments?: boolean
  allowRemoveDocuments?: boolean
}

export interface ResolvedMongoManagementAuthOptions {
  enabled: boolean
  authenticate: boolean
  userProperty: string
  adminField: string
  adminRoleNames: string[]
  rolesField: string
  permissionsField: string
  requiredPermissions: string[]
  requiredScopes: string[]
  scopeField: string
}

export interface ResolvedMongoManagementAuditOptions {
  enabled: boolean
}

export interface ResolvedMongoManagementOptions {
  enabled: boolean
  auth: ResolvedMongoManagementAuthOptions
  audit: ResolvedMongoManagementAuditOptions
  exposeDatabasesService: boolean
  exposeCollectionsService: boolean
  exposeUsersService: boolean
  exposeCollectionCrud: boolean
  basePath: string
  whitelistDatabases: string[]
  blacklistDatabases: string[]
  showSystemDatabases: boolean
  whitelistCollections: string[]
  blacklistCollections: string[]
  allowCreateDatabase: boolean
  allowDropDatabase: boolean
  allowCreateCollection: boolean
  allowDropCollection: boolean
  allowInsertDocuments: boolean
  allowPatchDocuments: boolean
  allowReplaceDocuments: boolean
  allowRemoveDocuments: boolean
}

export interface MongoManagementRouteSpec {
  key: 'databases' | 'collections' | 'users' | 'stats' | 'indexes' | 'count' | 'schema' | 'documents' | 'aggregate'
  path: string
}

type SerializableMongoClientOptions = PickSerializable<MongoClientOptions>

export type MongoOptions = MongoUrlOption & SerializableMongoClientOptions & {
  management?: MongoManagementOptions
}

export type ResolvedMongoOptions = MongoUrlOption & SerializableMongoClientOptions & {
  management: ResolvedMongoManagementOptions
}

export function normalizeMongoManagementBasePath(input?: string): string {
  const raw = String(input || '').trim()
  if (!raw)
    return '/mongo'

  const collapsed = raw.replace(/\/+/g, '/').replace(/\/{2,}/g, '/')
  const withLeadingSlash = collapsed.startsWith('/') ? collapsed : `/${collapsed}`
  const normalized = withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, '') : withLeadingSlash
  return normalized || '/mongo'
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input))
    return []

  return input
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function resolveMongoManagementAuthOptions(auth: MongoManagementOptions['auth']): ResolvedMongoManagementAuthOptions {
  if (auth === false) {
    return {
      enabled: false,
      authenticate: false,
      userProperty: 'user',
      adminField: 'isAdmin',
      adminRoleNames: ['admin'],
      rolesField: 'roles',
      permissionsField: 'permissions',
      requiredPermissions: [],
      requiredScopes: [],
      scopeField: 'scope',
    }
  }

  if (auth === true || auth == null) {
    return {
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
    }
  }

  return {
    enabled: auth.enabled !== false,
    authenticate: auth.authenticate !== false,
    userProperty: auth.userProperty || 'user',
    adminField: auth.adminField || 'isAdmin',
    adminRoleNames: normalizeStringArray(auth.adminRoleNames).length ? normalizeStringArray(auth.adminRoleNames) : ['admin'],
    rolesField: auth.rolesField || 'roles',
    permissionsField: auth.permissionsField || 'permissions',
    requiredPermissions: normalizeStringArray(auth.requiredPermissions),
    requiredScopes: normalizeStringArray(auth.requiredScopes),
    scopeField: auth.scopeField || 'scope',
  }
}

function resolveMongoManagementAuditOptions(audit: MongoManagementOptions['audit']): ResolvedMongoManagementAuditOptions {
  if (audit === false)
    return { enabled: false }

  if (audit === true || audit == null)
    return { enabled: true }

  return { enabled: audit.enabled !== false }
}

export function getMongoManagementRoutes(management: Pick<ResolvedMongoManagementOptions, 'enabled' | 'basePath' | 'exposeDatabasesService' | 'exposeCollectionsService' | 'exposeUsersService' | 'exposeCollectionCrud'>): MongoManagementRouteSpec[] {
  if (!management.enabled)
    return []

  const basePath = normalizeMongoManagementBasePath(management.basePath)
  const routes: MongoManagementRouteSpec[] = []

  if (management.exposeDatabasesService)
    routes.push({ key: 'databases', path: `${basePath}/databases` })

  if (management.exposeCollectionsService)
    routes.push({ key: 'collections', path: `${basePath}/:db/collections` })

  if (management.exposeUsersService)
    routes.push({ key: 'users', path: `${basePath}/users` })

  if (management.exposeCollectionCrud) {
    routes.push({ key: 'stats', path: `${basePath}/:db/stats` })
    routes.push({ key: 'indexes', path: `${basePath}/:db/:collection/indexes` })
    routes.push({ key: 'count', path: `${basePath}/:db/:collection/count` })
    routes.push({ key: 'schema', path: `${basePath}/:db/:collection/schema` })
    routes.push({ key: 'documents', path: `${basePath}/:db/:collection/documents` })
    routes.push({ key: 'aggregate', path: `${basePath}/:db/:collection/aggregate` })
  }

  return routes
}

export function resolveMongoOptions(mongodb: MongoOptions): ResolvedMongoOptions {
  const basePath = normalizeMongoManagementBasePath(mongodb.management?.basePath || '/mongo')
  return {
    ...mongodb,
    management: {
      enabled: mongodb.management?.enabled === true,
      auth: resolveMongoManagementAuthOptions(mongodb.management?.auth),
      audit: resolveMongoManagementAuditOptions(mongodb.management?.audit),
      exposeDatabasesService: mongodb.management?.exposeDatabasesService !== false,
      exposeCollectionsService: mongodb.management?.exposeCollectionsService !== false,
      exposeUsersService: mongodb.management?.exposeUsersService === true,
      exposeCollectionCrud: mongodb.management?.exposeCollectionCrud !== false,
      basePath,
      whitelistDatabases: normalizeStringArray(mongodb.management?.whitelistDatabases),
      blacklistDatabases: normalizeStringArray(mongodb.management?.blacklistDatabases),
      showSystemDatabases: mongodb.management?.showSystemDatabases === true,
      whitelistCollections: normalizeStringArray(mongodb.management?.whitelistCollections),
      blacklistCollections: normalizeStringArray(mongodb.management?.blacklistCollections),
      allowCreateDatabase: mongodb.management?.allowCreateDatabase === true,
      allowDropDatabase: mongodb.management?.allowDropDatabase === true,
      allowCreateCollection: mongodb.management?.allowCreateCollection === true,
      allowDropCollection: mongodb.management?.allowDropCollection === true,
      allowInsertDocuments: mongodb.management?.allowInsertDocuments === true,
      allowPatchDocuments: mongodb.management?.allowPatchDocuments === true,
      allowReplaceDocuments: mongodb.management?.allowReplaceDocuments === true,
      allowRemoveDocuments: mongodb.management?.allowRemoveDocuments === true,
    },
  }
}
