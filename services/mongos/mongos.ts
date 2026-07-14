// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from 'nuxt-feathers-zod/server'
import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, MongoService } from './mongos.class'
import { mongoDataResolver, mongoDataValidator, mongoExternalResolver, mongoPatchResolver, mongoPatchValidator, mongoQueryResolver, mongoQueryValidator, mongoResolver } from './mongos.schema'
import { mongoMethods, mongoPath } from './mongos.shared'

export * from './mongos.class'
export * from './mongos.schema'

// A configure function that registers the service and its hooks via `app.configure`
export function mongo(app: Application) {
  // Register our service on the Feathers application
  app.use(mongoPath, new MongoService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: mongoMethods,
    // You can add additional custom events to be sent to clients here
    events: [],
  })
  // Initialize hooks
  app.service(mongoPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(mongoExternalResolver), schemaHooks.resolveResult(mongoResolver)],
    },
    before: {
      all: [schemaHooks.validateQuery(mongoQueryValidator), schemaHooks.resolveQuery(mongoQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(mongoDataValidator), schemaHooks.resolveData(mongoDataResolver)],
      patch: [schemaHooks.validateData(mongoPatchValidator), schemaHooks.resolveData(mongoPatchResolver)],
      remove: [],
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
    [mongoPath]: MongoService
  }
}
