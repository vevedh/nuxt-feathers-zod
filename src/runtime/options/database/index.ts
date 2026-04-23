import type { MongoOptions, ResolvedMongoOptions } from './mongodb'
import { resolveMongoOptions } from './mongodb'

export interface DataBaseOptions {
  mongo?: MongoOptions
}

export interface ResolvedDataBaseOptions {
  mongo?: ResolvedMongoOptions
}

export function resolveDataBaseOptions(database: DataBaseOptions): ResolvedDataBaseOptions {
  const resolvedDataBaseOptions: ResolvedDataBaseOptions = {}

  if (database?.mongo) {
    resolvedDataBaseOptions.mongo = resolveMongoOptions(database.mongo)
  }

  return resolvedDataBaseOptions
}
