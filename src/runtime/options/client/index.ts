import type { ModuleOptions } from '..'
import type { PluginOptions, ResolvedPluginOptions } from '../plugins'
import type { PiniaOptions } from './pinia'
import { createResolver } from '@nuxt/kit'
import defu from 'defu'
import { klona } from 'klona'
import { NuxtFeathersError } from '../../errors'
import { preparePluginOptions, resolvePluginsOptions } from '../plugins'
import { resolvePiniaOptions } from './pinia'

export interface ClientOptions extends PluginOptions {
  pinia?: PiniaOptions | boolean
}

export interface ResolvedClientOptions extends ResolvedPluginOptions {
  pinia: PiniaOptions | false
}

export type ResolvedClientOptionsOrDisabled = ResolvedClientOptions | false

export type ResolvedClientOnlyOptions = Omit<ResolvedClientOptions, 'pinia'>

export const clientDefaults: ResolvedClientOnlyOptions = {
  plugins: [],
}

export function getClientDefaults(): ResolvedClientOnlyOptions {
  return klona(clientDefaults)
}

export async function resolveClientOptions(client: ModuleOptions['client'], mongodb: boolean, rootDir: string, srcDir: string): Promise<ResolvedClientOptionsOrDisabled> {
  if (client === false)
    return false

  let clientOptions: ClientOptions
  const clientDefaults = getClientDefaults()

  if (client === true || client === undefined) {
    clientOptions = clientDefaults
  }
  else if (typeof client === 'object') {
    clientOptions = defu(clientDefaults, preparePluginOptions(client))
  }
  else {
    throw new NuxtFeathersError('Invalid client options')
  }

  const srcResolver = createResolver(srcDir)
  const resolvedPlugins = await resolvePluginsOptions(clientOptions, rootDir, srcResolver.resolve('feathers'))

  const pinia = resolvePiniaOptions(clientOptions.pinia, mongodb)

  const resolvedClient: ResolvedClientOptions = {
    pinia,
    ...resolvedPlugins,
  }

  return resolvedClient
}
