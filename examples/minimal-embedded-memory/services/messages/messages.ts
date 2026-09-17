import type { Application } from 'nuxt-feathers-zod/server'
import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, MessageService } from './messages.class'
import {
  messageDataResolver,
  messageDataValidator,
  messageExternalResolver,
  messagePatchResolver,
  messagePatchValidator,
  messageQueryResolver,
  messageQueryValidator,
  messageResolver,
} from './messages.schema'
import { messageMethods, messagePath } from './messages.shared'

export function message(app: Application) {
  app.use(messagePath, new MessageService(getOptions(app)), { methods: [...messageMethods], events: [] })
  app.service(messagePath).hooks({
    around: { all: [schemaHooks.resolveExternal(messageExternalResolver), schemaHooks.resolveResult(messageResolver)] },
    before: {
      all: [schemaHooks.validateQuery(messageQueryValidator), schemaHooks.resolveQuery(messageQueryResolver)],
      create: [schemaHooks.validateData(messageDataValidator), schemaHooks.resolveData(messageDataResolver)],
      patch: [schemaHooks.validateData(messagePatchValidator), schemaHooks.resolveData(messagePatchResolver)],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [messagePath]: MessageService
  }
}
