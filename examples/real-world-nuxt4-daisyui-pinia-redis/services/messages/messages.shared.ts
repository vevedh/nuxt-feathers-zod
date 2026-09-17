import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { Message, MessageData, MessagePatch, MessageQuery, MessageService } from './messages.class'

export type { Message, MessageData, MessagePatch, MessageQuery }

export type MessageClientService = Pick<MessageService<Params<MessageQuery>>, (typeof messageMethods)[number]>

export const messagePath = 'messages'

export const messageMethods: Array<keyof MessageService> = ['find', 'get', 'create', 'patch', 'remove']

export function messageClient(client: ClientApplication) {
  const connection = client.get('connection')

  client.use(messagePath, connection.service(messagePath), {
    methods: messageMethods,
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [messagePath]: MessageClientService
  }
}
