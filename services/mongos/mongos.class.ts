// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Db } from 'mongodb'
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
  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: app.get('mongodbClient').then((db: Db) => db.collection('mongos')),
  }
}
