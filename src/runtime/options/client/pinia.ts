import type { ModuleOptions as PiniaNuxtModuleOptions } from '@pinia/nuxt'
import type { CreatePiniaClientConfig, PiniaServiceConfig } from 'feathers-pinia'
import { klona } from 'klona'

export type PiniaModuleOptions = Pick<PiniaNuxtModuleOptions, 'storesDirs'>

export type removableServiceOptions = 'customizeStore' | 'handleEvents' | 'setupInstance' | 'customFilters' | 'customSiftOperators'

export type SerializablePiniaServiceConfig = Omit<PiniaServiceConfig, removableServiceOptions>

export interface SerializablePiniaClientOptions extends Partial<Omit<CreatePiniaClientConfig, 'pinia' | 'services' | 'storage' | removableServiceOptions>> {
  services?: Record<string, SerializablePiniaServiceConfig>
}

export type PiniaOptions = SerializablePiniaClientOptions & PiniaModuleOptions

export type ResolvedPiniaOptions = Required<Pick<PiniaOptions, 'storesDirs' | 'idField'>> & Omit<PiniaOptions, 'storesDirs' | 'idField'>

export type ResolvedPiniaOptionsOrDisabled = ResolvedPiniaOptions | false

export const piniaDefaults: ResolvedPiniaOptions = {
  storesDirs: ['stores'],
  idField: 'id', // use _id for mongoDB
}

export function getPiniaDefaults(mongodb: boolean): ResolvedPiniaOptions {
  const resolvedPiniaDefaults: ResolvedPiniaOptions = klona(piniaDefaults)
  if (mongodb) {
    resolvedPiniaDefaults.idField = '_id'
  }
  return resolvedPiniaDefaults
}

export function resolvePiniaOptions(piniaOptions: PiniaOptions | boolean | undefined, mongodb: boolean): ResolvedPiniaOptionsOrDisabled {
  let pinia: ResolvedPiniaOptionsOrDisabled = false

  const piniaDefaultOptions = getPiniaDefaults(mongodb)

  // Feathers-Pinia is optional and must be explicitly enabled.
  // Keeping it disabled by default prevents Vite/browser interop issues in
  // applications that only need the standard Feathers client and NFZ auth runtime.
  if (piniaOptions === true)
    pinia = piniaDefaultOptions
  else if (typeof piniaOptions === 'object' && piniaOptions)
    pinia = { ...piniaDefaultOptions, ...piniaOptions }

  return pinia
}
