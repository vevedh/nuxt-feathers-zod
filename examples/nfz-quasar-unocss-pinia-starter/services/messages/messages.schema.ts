import type { HookContext } from 'nuxt-feathers-zod/server'
import type { MessageService } from './messages.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

function toEntityId(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number')
    return value

  if (value && typeof value === 'object' && 'toString' in value)
    return String(value)

  return undefined
}

export const messageSchema = z.object({
  _id: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  text: z.string().min(1).max(500),
  userId: z.string().optional(),
  createdAt: z.string(),
})

export type Message = z.infer<typeof messageSchema>
export const messageValidator = getZodValidator(messageSchema, { kind: 'data' })

export const messageResolver = resolve<Message, HookContext<MessageService>>({
  _id: async value => toEntityId(value),
  id: async (value, message) => toEntityId(value) ?? toEntityId(message._id),
})

export const messageExternalResolver = resolve<Message, HookContext<MessageService>>({
  _id: async value => toEntityId(value),
  id: async (value, message) => toEntityId(value) ?? toEntityId(message._id),
})

export const messageDataSchema = messageSchema.pick({
  text: true,
})

export type MessageData = z.infer<typeof messageDataSchema>
export const messageDataValidator = getZodValidator(messageDataSchema, { kind: 'data' })
export const messageDataResolver = resolve<Message, HookContext<MessageService>>({
  userId: async (_value, _message, context) => {
    const user = context.params.user as {
      userId?: string
      id?: string | number
      _id?: string | number
    } | undefined

    return user?.userId ?? String(user?.id ?? user?._id ?? 'system')
  },
  createdAt: async () => new Date().toISOString(),
})

export const messagePatchSchema = messageSchema.partial().pick({
  text: true,
})

export type MessagePatch = z.infer<typeof messagePatchSchema>
export const messagePatchValidator = getZodValidator(messagePatchSchema, { kind: 'data' })
export const messagePatchResolver = resolve<Message, HookContext<MessageService>>({})

export const messageQuerySchema = zodQuerySyntax(messageSchema)
export type MessageQuery = z.infer<typeof messageQuerySchema>
export const messageQueryValidator = getZodValidator(messageQuerySchema, { kind: 'query' })
export const messageQueryResolver = resolve<MessageQuery, HookContext<MessageService>>({})
