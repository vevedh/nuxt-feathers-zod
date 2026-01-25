// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html

import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { SwaggerTests, SwaggerTestsData, SwaggerTestsPatch, SwaggerTestsQuery, SwaggerTestsService } from './swagger-tests.class'

export type { SwaggerTests, SwaggerTestsData, SwaggerTestsPatch, SwaggerTestsQuery }

export type SwaggerTestsClientService = Pick<SwaggerTestsService<Params<SwaggerTestsQuery>>, (typeof swaggerTestsMethods)[number]>

export const swaggerTestsPath = 'swagger-tests'

export const swaggerTestsMethods: Array<keyof SwaggerTestsService> = ['find', 'get', 'create', 'patch', 'remove']

export function swaggerTestsClient(client: ClientApplication) {
  const connection = client.get('connection')

  client.use(swaggerTestsPath, connection.service(swaggerTestsPath), {
    methods: swaggerTestsMethods,
  })
}

// Add this service to the service type index
declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [swaggerTestsPath]: SwaggerTestsClientService
  }
}
