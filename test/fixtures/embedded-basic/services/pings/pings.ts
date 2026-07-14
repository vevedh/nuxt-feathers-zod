import type { Application } from 'nuxt-feathers-zod/server'
import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, PingService } from './pings.class'
import {
  pingDataResolver,
  pingDataValidator,
  pingExternalResolver,
  pingPatchResolver,
  pingPatchValidator,
  pingQueryResolver,
  pingQueryValidator,
  pingResolver,
} from './pings.schema'
import { pingMethods, pingPath } from './pings.shared'

export * from './pings.class'
export * from './pings.schema'

export function ping(app: Application) {
  app.use(pingPath, new PingService(getOptions(app)), {
    methods: [...pingMethods],
    events: [],
  })

  app.service(pingPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(pingExternalResolver), schemaHooks.resolveResult(pingResolver)],
    },
    before: {
      all: [schemaHooks.validateQuery(pingQueryValidator), schemaHooks.resolveQuery(pingQueryResolver)],
      create: [schemaHooks.validateData(pingDataValidator), schemaHooks.resolveData(pingDataResolver)],
      patch: [schemaHooks.validateData(pingPatchValidator), schemaHooks.resolveData(pingPatchResolver)],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [pingPath]: PingService
  }
}
