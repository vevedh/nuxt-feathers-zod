import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { Ping, PingData, PingPatch, PingQuery, PingService } from './pings.class'

export type { Ping, PingData, PingPatch, PingQuery }

export type PingClientService = Pick<PingService<Params<PingQuery>>, (typeof pingMethods)[number]>

export const pingPath = 'pings'
export const pingMethods = ['find', 'get', 'create', 'patch', 'remove'] as const

export function pingClient(client: ClientApplication) {
  const connection = client.get('connection')
  client.use(pingPath, connection.service(pingPath), {
    methods: [...pingMethods],
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [pingPath]: PingClientService
  }
}
