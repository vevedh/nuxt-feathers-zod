import type { MongoOptions } from './mongodb'
import { resolveMongoOptions } from './mongodb'

export interface DataBaseOptions {
  mongo?: MongoOptions
}

export type ResolvedDataBaseOptions = DataBaseOptions

export function resolveDataBaseOptions(database: DataBaseOptions): ResolvedDataBaseOptions {
  const resolvedDataBaseOptions: ResolvedDataBaseOptions = {}

  if (database?.mongo) {
    resolvedDataBaseOptions.mongo = resolveMongoOptions(database.mongo)
  }

  return resolvedDataBaseOptions
}
