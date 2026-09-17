import type { HookContext } from 'nuxt-feathers-zod/server'
import type { MessageService } from './messages.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

export const messageSchema = z.object({ id: z.number().int(), text: z.string().min(1).max(240) })
export type Message = z.infer<typeof messageSchema>
export const messageValidator = getZodValidator(messageSchema, { kind: 'data' })
export const messageResolver = resolve<Message, HookContext<MessageService>>({})
export const messageExternalResolver = resolve<Message, HookContext<MessageService>>({})

export const messageDataSchema = messageSchema.pick({ text: true })
export type MessageData = z.infer<typeof messageDataSchema>
export const messageDataValidator = getZodValidator(messageDataSchema, { kind: 'data' })
export const messageDataResolver = resolve<MessageData, HookContext<MessageService>>({})

export const messagePatchSchema = messageDataSchema.partial()
export type MessagePatch = z.infer<typeof messagePatchSchema>
export const messagePatchValidator = getZodValidator(messagePatchSchema, { kind: 'data' })
export const messagePatchResolver = resolve<MessagePatch, HookContext<MessageService>>({})

export const messageQuerySchema = zodQuerySyntax(messageSchema.pick({ id: true, text: true }))
export type MessageQuery = z.infer<typeof messageQuerySchema>
export const messageQueryValidator = getZodValidator(messageQuerySchema, { kind: 'query' })
export const messageQueryResolver = resolve<MessageQuery, HookContext<MessageService>>({})
