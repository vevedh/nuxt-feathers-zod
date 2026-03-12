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

type SerializableMongoClientOptions = PickSerializable<MongoClientOptions>

export type MongoOptions = MongoUrlOption & SerializableMongoClientOptions & {
  management?: MongoManagementOptions
}

export type ResolvedMongoOptions = MongoUrlOption & SerializableMongoClientOptions & {
  management: ResolvedMongoManagementOptions
}

export function resolveMongoOptions(mongodb: MongoOptions): ResolvedMongoOptions {
  const basePath = mongodb.management?.basePath || '/mongo'
  return {
    ...mongodb,
    management: {
      enabled: mongodb.management?.enabled === true,
      auth: mongodb.management?.auth !== false,
      exposeDatabasesService: mongodb.management?.exposeDatabasesService !== false,
      exposeCollectionsService: mongodb.management?.exposeCollectionsService !== false,
      exposeUsersService: mongodb.management?.exposeUsersService === true,
      exposeCollectionCrud: mongodb.management?.exposeCollectionCrud !== false,
      basePath: basePath.startsWith('/') ? basePath : `/${basePath}`,
    },
  }
}
