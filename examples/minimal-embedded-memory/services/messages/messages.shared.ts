import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { MessageService } from './messages.class'
import type { Message, MessageData, MessagePatch, MessageQuery } from './messages.schema'

export type MessageClientService = Pick<MessageService<Params<MessageQuery>>, (typeof messageMethods)[number]>
export const messagePath = 'messages'
export const messageMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export function messageClient(client: ClientApplication) {
  const connection = client.get('connection')
  client.use(messagePath, connection.service(messagePath), { methods: [...messageMethods] })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [messagePath]: MessageClientService
  }
}

export type { Message, MessageData, MessagePatch, MessageQuery }
