// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { SwaggerTestsService } from './swagger-tests.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')

// Main data model schema
export const swaggerTestsSchema = z.object({
  _id: objectIdSchema(),
  name: z.string().min(1),
  note: z.string().optional(),
})

export type SwaggerTests = z.infer<typeof swaggerTestsSchema>
export const swaggerTestsValidator = getZodValidator(swaggerTestsSchema, { kind: 'data' })
export const swaggerTestsResolver = resolve<SwaggerTests, HookContext<SwaggerTestsService>>({})

export const swaggerTestsExternalResolver = resolve<SwaggerTests, HookContext<SwaggerTestsService>>({})

// Schema for creating new entries
export const swaggerTestsDataSchema = swaggerTestsSchema.pick({ name: true, note: true })
export type SwaggerTestsData = z.infer<typeof swaggerTestsDataSchema>
export const swaggerTestsDataValidator = getZodValidator(swaggerTestsDataSchema, { kind: 'data' })
export const swaggerTestsDataResolver = resolve<SwaggerTests, HookContext<SwaggerTestsService>>({})

// Schema for updating existing entries
export const swaggerTestsPatchSchema = swaggerTestsSchema.partial()
export type SwaggerTestsPatch = z.infer<typeof swaggerTestsPatchSchema>
export const swaggerTestsPatchValidator = getZodValidator(swaggerTestsPatchSchema, { kind: 'data' })
export const swaggerTestsPatchResolver = resolve<SwaggerTests, HookContext<SwaggerTestsService>>({})

// Schema for allowed query properties
export const swaggerTestsQuerySchema = zodQuerySyntax(swaggerTestsSchema)
export type SwaggerTestsQuery = z.infer<typeof swaggerTestsQuerySchema>
export const swaggerTestsQueryValidator = getZodValidator(swaggerTestsQuerySchema, { kind: 'query' })
export const swaggerTestsQueryResolver = resolve<SwaggerTestsQuery, HookContext<SwaggerTestsService>>({})
