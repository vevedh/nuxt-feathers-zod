import type { MongoClientOptions } from 'mongodb'

type PickSerializable<T> = {
  // eslint-disable-next-line ts/no-unsafe-function-type
  [K in keyof T as NonNullable<T[K]> extends Function ? never : K]: T[K];
}

interface MongoUrlOption {
  url: string
}

type SerializableMongoClientOptions = PickSerializable<MongoClientOptions>

export type MongoOptions = MongoUrlOption & SerializableMongoClientOptions

export type ResolvedMongoOptions = MongoOptions

export function resolveMongoOptions(mongodb: MongoOptions): ResolvedMongoOptions {
  // let resolvedMongodb: ResolvedMongoOptions
  return mongodb
}
