import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Db } from 'mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import type { Message, MessageData, MessagePatch, MessageQuery } from './messages.schema'
import { MongoDBService } from '@feathersjs/mongodb'

export type { Message, MessageData, MessagePatch, MessageQuery }

export interface MessageParams extends MongoDBAdapterParams<MessageQuery> {}

export class MessageService<ServiceParams extends Params = MessageParams> extends MongoDBService<
  Message,
  MessageData,
  MessageParams,
  MessagePatch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient') as Promise<Db> | undefined

  if (!mongoClient || typeof (mongoClient as any).then !== 'function') {
    throw new Error(
      '[nfz-starter] Service messages utilise MongoDB mais app.get(\'mongodbClient\') est indisponible. '
      + 'Vérifie feathers.database.mongo.url et démarre MongoDB avec bun run db:up.',
    )
  }

  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then(db => db.collection('messages')),
  }
}
