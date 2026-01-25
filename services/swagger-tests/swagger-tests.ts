// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from 'nuxt-feathers-zod/server'
import { hooks as schemaHooks } from '@feathersjs/schema'
import { authenticate } from '@feathersjs/authentication'
import type { Application as FeathersApplication } from '@feathersjs/feathers'

// Ensure legacy swagger `docs` metadata is accepted in ServiceOptions during typecheck.
declare module '@feathersjs/feathers' {
  interface ServiceOptions {
    docs?: unknown
  }
}

import { getOptions, SwaggerTestsService } from './swagger-tests.class'
import {
  swaggerTestsDataResolver,
  swaggerTestsDataSchema,
  swaggerTestsDataValidator,
  swaggerTestsExternalResolver,
  swaggerTestsPatchResolver,
  swaggerTestsPatchSchema,
  swaggerTestsPatchValidator,
  swaggerTestsQueryResolver,
  swaggerTestsQuerySchema,
  swaggerTestsQueryValidator,
  swaggerTestsResolver,
  swaggerTestsSchema,
} from './swagger-tests.schema'
import { swaggerTestsMethods, swaggerTestsPath } from './swagger-tests.shared'

export * from './swagger-tests.class'
export * from './swagger-tests.schema'

// A configure function that registers the service and its hooks via `app.configure`
export function swaggerTests(app: Application) {
  // Register our service on the Feathers application
  const feathersApp = app as unknown as FeathersApplication
  feathersApp.use(swaggerTestsPath, new SwaggerTestsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: swaggerTestsMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
    // Swagger (legacy) docs. Requires the module flag `feathers.swagger` to expose UI/JSON.
    docs: {
      description: 'Swagger integration smoke-test service',
      idType: 'string',
      securities: swaggerTestsMethods,
      definitions: {
        swaggerTest: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' }, note: { type: 'string' } } },
        swaggerTestData: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, note: { type: 'string' } } },
        swaggerTestPatch: { type: 'object', properties: { name: { type: 'string' }, note: { type: 'string' } } },
        swaggerTestQuery: { type: 'object', properties: { name: { type: 'string' }, $limit: { type: 'number' }, $skip: { type: 'number' }, $sort: { type: 'object', additionalProperties: { type: 'number' } } } },
      },
    },
  })

  // Initialize hooks
  app.service(swaggerTestsPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(swaggerTestsExternalResolver), schemaHooks.resolveResult(swaggerTestsResolver)],
    },
    before: {
      all: [schemaHooks.validateQuery(swaggerTestsQueryValidator), schemaHooks.resolveQuery(swaggerTestsQueryResolver)],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [schemaHooks.validateData(swaggerTestsDataValidator), schemaHooks.resolveData(swaggerTestsDataResolver)],
      patch: [authenticate('jwt'), schemaHooks.validateData(swaggerTestsPatchValidator), schemaHooks.resolveData(swaggerTestsPatchResolver)],
      remove: [authenticate('jwt')],
    },
    after: {
      all: [],
    },
    error: {
      all: [],
    },
  })
}

// Add this service to the service type index
declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [swaggerTestsPath]: SwaggerTestsService
  }
}
