import type { Params } from '@feathersjs/feathers'
import type { MemoryServiceOptions } from '@feathersjs/memory'
import type { Application } from 'nuxt-feathers-zod/server'
import type { Message, MessageData, MessagePatch, MessageQuery } from './messages.schema'
import { MemoryService } from '@feathersjs/memory'

export interface MessageParams extends Params<MessageQuery> {}
export class MessageService<ServiceParams extends Params = MessageParams> extends MemoryService<
  Message,
  MessageData,
  ServiceParams,
  MessagePatch
> {}

export function getOptions(_app: Application): MemoryServiceOptions<Message> {
  return { multi: true }
}
