import type { HookContext } from 'nuxt-feathers-zod/server'
import type { PingService } from './pings.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

export const pingSchema = z.object({
  id: z.number().int(),
  label: z.string().min(1),
})

export type Ping = z.infer<typeof pingSchema>
export const pingValidator = getZodValidator(pingSchema, { kind: 'data' })
export const pingResolver = resolve<Ping, HookContext<PingService>>({})
export const pingExternalResolver = resolve<Ping, HookContext<PingService>>({})

export const pingDataSchema = pingSchema.pick({
  label: true,
})
export type PingData = z.infer<typeof pingDataSchema>
export const pingDataValidator = getZodValidator(pingDataSchema, { kind: 'data' })
export const pingDataResolver = resolve<PingData, HookContext<PingService>>({})

export const pingPatchSchema = pingDataSchema.partial()
export type PingPatch = z.infer<typeof pingPatchSchema>
export const pingPatchValidator = getZodValidator(pingPatchSchema, { kind: 'data' })
export const pingPatchResolver = resolve<PingPatch, HookContext<PingService>>({})

export const pingQuerySchema = zodQuerySyntax(pingSchema.pick({ id: true, label: true }))
export type PingQuery = z.infer<typeof pingQuerySchema>
export const pingQueryValidator = getZodValidator(pingQuerySchema, { kind: 'query' })
export const pingQueryResolver = resolve<PingQuery, HookContext<PingService>>({})
