// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#database-services

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Db } from 'mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import type { SwaggerTests, SwaggerTestsData, SwaggerTestsPatch, SwaggerTestsQuery } from './swagger-tests.schema'
import { MongoDBService } from '@feathersjs/mongodb'

export type { SwaggerTests, SwaggerTestsData, SwaggerTestsPatch, SwaggerTestsQuery }

export interface SwaggerTestsParams extends MongoDBAdapterParams<SwaggerTestsQuery> {}

// By default calls the standard MongoDB adapter service methods but can be customized with your own functionality.
export class SwaggerTestsService<ServiceParams extends Params = SwaggerTestsParams> extends MongoDBService<
  SwaggerTests,
  SwaggerTestsData,
  SwaggerTestsParams,
  SwaggerTestsPatch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: app.get('mongodbClient').then((db: Db) => db.collection('swagger-tests')),
  }
}
