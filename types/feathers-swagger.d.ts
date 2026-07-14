import type { ServiceSwaggerOptions } from 'feathers-swagger'

declare module '@feathersjs/feathers' {
  interface ServiceOptions {
    /** Optional Swagger (legacy) docs config used by feathers-swagger */
    docs?: ServiceSwaggerOptions
  }
}
