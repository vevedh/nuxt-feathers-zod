import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Db } from 'mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import type { User, UserData, UserPatch, UserQuery } from './users.schema'
import { MongoDBService } from '@feathersjs/mongodb'

export type { User, UserData, UserPatch, UserQuery }

export interface UserParams extends MongoDBAdapterParams<UserQuery> {}

export class UserService<ServiceParams extends Params = UserParams> extends MongoDBService<
  User,
  UserData,
  UserParams,
  UserPatch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient') as Promise<Db> | undefined

  if (!mongoClient || typeof (mongoClient as any).then !== 'function') {
    throw new Error(
      '[nfz-starter] Service users utilise MongoDB mais app.get(\'mongodbClient\') est indisponible. '
      + 'Vérifie feathers.database.mongo.url et démarre MongoDB avec bun run db:up.',
    )
  }

  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then(db => db.collection('users')),
  }
}
