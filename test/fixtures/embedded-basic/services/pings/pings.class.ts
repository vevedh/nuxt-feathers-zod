import type { Params } from '@feathersjs/feathers'
import type { MemoryServiceOptions } from '@feathersjs/memory'
import type { Application } from 'nuxt-feathers-zod/server'
import type { Ping, PingData, PingPatch, PingQuery } from './pings.schema'
import { MemoryService } from '@feathersjs/memory'

export type { Ping, PingData, PingPatch, PingQuery }

export interface PingParams extends Params<PingQuery> {}

export class PingService<ServiceParams extends Params = PingParams> extends MemoryService<Ping, PingData, ServiceParams, PingPatch> {}

export function getOptions(_app: Application): MemoryServiceOptions<Ping> {
  return {
    multi: true,
  }
}
