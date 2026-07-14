// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Db } from 'mongodb'

type MongoClientLike = Promise<Db>
import type { Application } from 'nuxt-feathers-zod/server'
import type { Mongo, MongoData, MongoPatch, MongoQuery } from './mongos.schema'
import { MongoDBService } from '@feathersjs/mongodb'

export type { Mongo, MongoData, MongoPatch, MongoQuery }

export interface MongoParams extends MongoDBAdapterParams<MongoQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class MongoService<ServiceParams extends Params = MongoParams> extends MongoDBService<
  Mongo,
  MongoData,
  MongoParams,
  MongoPatch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient') as MongoClientLike | undefined

  if (!mongoClient || typeof (mongoClient as any).then !== 'function') {
    throw new Error(
      `[nuxt-feathers-zod] Service 'mongos' uses adapter 'mongodb' but app.get('mongodbClient') is not configured. `
      + `Enable feathers.database.mongo in embedded mode, or regenerate this service with --adapter memory.`,
    )
  }

  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then((db: Db) => db.collection('mongos')),
  }
}
