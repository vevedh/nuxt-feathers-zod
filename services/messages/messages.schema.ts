// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { MessageService } from './messages.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

// Main data model schema
export const messageSchema = z.object({
  id: z.number().int(),
  text: z.string(),
})
export type Message = z.infer<typeof messageSchema>
export const messageValidator = getZodValidator(messageSchema, { kind: 'data' })
export const messageResolver = resolve<Message, HookContext<MessageService>>({})

export const messageExternalResolver = resolve<Message, HookContext<MessageService>>({})

// Schema for creating new entries
export const messageDataSchema = messageSchema.pick({ text: true })
export type MessageData = z.infer<typeof messageDataSchema>
export const messageDataValidator = getZodValidator(messageDataSchema, { kind: 'data' })
export const messageDataResolver = resolve<Message, HookContext<MessageService>>({})

// Schema for updating existing entries
export const messagePatchSchema = messageSchema.partial()
export type MessagePatch = z.infer<typeof messagePatchSchema>
export const messagePatchValidator = getZodValidator(messagePatchSchema, { kind: 'data' })
export const messagePatchResolver = resolve<Message, HookContext<MessageService>>({})

// Schema for allowed query properties
export const messageQuerySchema = zodQuerySyntax(messageSchema)
export type MessageQuery = z.infer<typeof messageQuerySchema>
export const messageQueryValidator = getZodValidator(messageQuerySchema, { kind: 'query' })
export const messageQueryResolver = resolve<MessageQuery, HookContext<MessageService>>({})
