import type { Application } from 'nuxt-feathers-zod/server'
import { authenticate } from '@feathersjs/authentication'
import { hooks as schemaHooks } from '@feathersjs/schema'

import { ActionsService } from './actions.class'
import {
  actionRunDataResolver,
  actionRunDataValidator,
  actionRunResultResolver,
} from './actions.schema'
import { actionsMethods, actionsPath } from './actions.shared'

export * from './actions.class'
export * from './actions.schema'

// Server registration (auto-detected by nuxt-feathers-zod services scanner)
export function actions(app: Application) {
  app.use(actionsPath, new ActionsService(app), {
    methods: actionsMethods as unknown as string[],
    events: [],
  })

  // Hooks can target custom methods exactly like built-ins (key = method name)
  app.service(actionsPath).hooks({
    around: {
      all: [],
      find: [],
      run: [authenticate('jwt'), schemaHooks.resolveResult(actionRunResultResolver)],
    },
    before: {
      all: [],
      // Validate/resolve **custom method** input data
      run: [
        schemaHooks.validateData(actionRunDataValidator),
        schemaHooks.resolveData(actionRunDataResolver),
      ],
    },
    after: {
      all: [],
    },
    error: {
      all: [],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [actionsPath]: ActionsService
  }
}
