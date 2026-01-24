// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { MongoService } from './mongos.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')

// Main data model schema
export const mongoSchema = z.object({
  _id: objectIdSchema(),
  text: z.string(),
})
export type Mongo = z.infer<typeof mongoSchema>
export const mongoValidator = getZodValidator(mongoSchema, { kind: 'data' })
export const mongoResolver = resolve<Mongo, HookContext<MongoService>>({})

export const mongoExternalResolver = resolve<Mongo, HookContext<MongoService>>({})

// Schema for creating new entries
export const mongoDataSchema = mongoSchema.pick({ text: true })
export type MongoData = z.infer<typeof mongoDataSchema>
export const mongoDataValidator = getZodValidator(mongoDataSchema, { kind: 'data' })
export const mongoDataResolver = resolve<Mongo, HookContext<MongoService>>({})

// Schema for updating existing entries
export const mongoPatchSchema = mongoSchema.partial()
export type MongoPatch = z.infer<typeof mongoPatchSchema>
export const mongoPatchValidator = getZodValidator(mongoPatchSchema, { kind: 'data' })
export const mongoPatchResolver = resolve<Mongo, HookContext<MongoService>>({})

// Schema for allowed query properties
export const mongoQuerySchema = zodQuerySyntax(mongoSchema)
export type MongoQuery = z.infer<typeof mongoQuerySchema>
export const mongoQueryValidator = getZodValidator(mongoQuerySchema, { kind: 'query' })
export const mongoQueryResolver = resolve<MongoQuery, HookContext<MongoService>>({})
