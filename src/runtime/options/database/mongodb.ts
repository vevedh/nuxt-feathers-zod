import type { MongoClientOptions } from 'mongodb'

type PickSerializable<T> = {
  // eslint-disable-next-line ts/no-unsafe-function-type
  [K in keyof T as NonNullable<T[K]> extends Function ? never : K]: T[K];
}

interface MongoUrlOption {
  url: string
}

export interface MongoManagementOptions {
  enabled?: boolean
  auth?: boolean
  exposeDatabasesService?: boolean
  exposeCollectionsService?: boolean
  exposeUsersService?: boolean
  exposeCollectionCrud?: boolean
  basePath?: string
}

export interface ResolvedMongoManagementOptions {
  enabled: boolean
  auth: boolean
  exposeDatabasesService: boolean
  exposeCollectionsService: boolean
  exposeUsersService: boolean
  exposeCollectionCrud: boolean
  basePath: string
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
      auth: mongodb.management?.auth !== false,
      exposeDatabasesService: mongodb.management?.exposeDatabasesService !== false,
      exposeCollectionsService: mongodb.management?.exposeCollectionsService !== false,
      exposeUsersService: mongodb.management?.exposeUsersService === true,
      exposeCollectionCrud: mongodb.management?.exposeCollectionCrud !== false,
      basePath,
    },
  }
}
