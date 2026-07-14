import type { Application } from 'nuxt-feathers-zod/server'
import { authenticate } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, UserService } from './users.class'
import {
  userDataResolver,
  userDataValidator,
  userExternalResolver,
  userPatchResolver,
  userPatchValidator,
  userQueryResolver,
  userQueryValidator,
  userResolver,
} from './users.schema'
import { userMethods, userPath } from './users.shared'

export * from './users.class'
export * from './users.schema'

export function user(app: Application) {
  app.use(userPath, new UserService(getOptions(app)), {
    methods: userMethods,
    events: [],
  })

  app.service(userPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(userExternalResolver),
        schemaHooks.resolveResult(userResolver),
      ],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [],
      update: [authenticate('jwt')],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')],
    },
    before: {
      all: [
        schemaHooks.validateQuery(userQueryValidator),
        schemaHooks.resolveQuery(userQueryResolver),
      ],
      create: [
        schemaHooks.validateData(userDataValidator),
        schemaHooks.resolveData(userDataResolver),
      ],
      patch: [
        schemaHooks.validateData(userPatchValidator),
        schemaHooks.resolveData(userPatchResolver),
      ],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [userPath]: UserService
  }
}
