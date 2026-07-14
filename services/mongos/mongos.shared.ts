// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { Mongo, MongoData, MongoPatch, MongoQuery, MongoService } from './mongos.class'

export type { Mongo, MongoData, MongoPatch, MongoQuery }

export type MongoClientService = Pick<MongoService<Params<MongoQuery>>, (typeof mongoMethods)[number]>

export const mongoPath = 'mongos'

export const mongoMethods: Array<keyof MongoService> = ['find', 'get', 'create', 'patch', 'remove']

export function mongoClient(client: ClientApplication) {
  const connection = client.get('connection')

  client.use(mongoPath, connection.service(mongoPath), {
    methods: mongoMethods,
  })
}

// Add this service to the client service type index
declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [mongoPath]: MongoClientService
  }
}
