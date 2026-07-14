import type { Application as FeathersApplication, TransportConnection } from '@feathersjs/feathers'

export interface ServiceTypes {}

export interface Configuration {
  connection: TransportConnection<ServiceTypes>
}

export type ClientApplication = FeathersApplication<ServiceTypes, Configuration>

export type FeathersClientPlugin = Parameters<ClientApplication['configure']>['0']

export function defineFeathersClientPlugin(def: FeathersClientPlugin): FeathersClientPlugin {
  return def
}
