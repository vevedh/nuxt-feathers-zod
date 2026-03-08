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
  mode?: 'embedded' | 'remote'
  remote?: {
    url: string
    transport?: 'auto' | 'rest' | 'socketio'
    restPath?: string
    websocketPath?: string
    auth?: {
      enabled?: boolean
      servicePath?: string
      payloadMode?: 'jwt' | 'keycloak'
      strategy?: string
      tokenField?: string
      reauth?: boolean
      storageKey?: string
    }
    services?: Array<{
      path: string
      methods?: string[]
    }>
  }
  pinia?: PiniaOptions | boolean
}

export interface ResolvedClientOptions extends ResolvedPluginOptions {
  mode: 'embedded' | 'remote'
  remote?: ClientOptions['remote']
  pinia: PiniaOptions | false
}

export type ResolvedClientOptionsOrDisabled = ResolvedClientOptions | false
export type ResolvedClientOnlyOptions = Omit<ResolvedClientOptions, 'pinia'>

export const clientDefaults: ResolvedClientOnlyOptions = {
  mode: 'embedded',
  plugins: [],
}

export function getClientDefaults(): ResolvedClientOnlyOptions {
  return klona(clientDefaults)
}

export async function resolveClientOptions(
  client: ModuleOptions['client'],
  mongodb: boolean,
  rootDir: string,
  srcDir: string,
): Promise<ResolvedClientOptionsOrDisabled> {
  if (client === false) {
    return false
  }

  let clientOptions: ClientOptions
  const defaults = getClientDefaults()

  if (client === true || client === undefined) {
    clientOptions = defaults
  }
  else if (typeof client === 'object') {
    clientOptions = defu(preparePluginOptions(client), defaults)
  }
  else {
    throw new NuxtFeathersError('Invalid client options')
  }

  const srcResolver = createResolver(srcDir)
  const resolvedPlugins = await resolvePluginsOptions(clientOptions, rootDir, srcResolver.resolve('feathers'))
  const pinia = resolvePiniaOptions(clientOptions.pinia, mongodb)

  const mode = clientOptions.mode ?? 'embedded'
  let remote = clientOptions.remote

  if (mode === 'remote' && remote) {
    remote = {
      transport: 'auto',
      auth: {
        enabled: false,
        servicePath: 'authentication',
        payloadMode: 'jwt',
        strategy: 'jwt',
        tokenField: 'accessToken',
        reauth: true,
        storageKey: 'feathers-jwt',
        ...(remote as any).auth,
      },
      services: (remote as any).services ?? [],
      ...remote,
    } as any
  }

  if (mode === 'remote') {
    if (!remote?.url || typeof remote.url !== 'string') {
      throw new NuxtFeathersError('feathers.client.mode is "remote" but feathers.client.remote.url is missing')
    }

    if (!/^https?:\/\//.test(remote.url)) {
      throw new NuxtFeathersError('feathers.client.remote.url must start with http:// or https://')
    }
  }

  if (mode === 'remote' && remote) {
    if (remote.auth?.enabled) {
      remote.auth.servicePath ||= 'authentication'
      remote.auth.strategy ||= 'jwt'
      remote.auth.tokenField ||= remote.auth.payloadMode === 'keycloak' ? 'access_token' : 'accessToken'
      remote.auth.storageKey ||= 'feathers-jwt'
    }

    if (remote.services && !Array.isArray(remote.services)) {
      throw new NuxtFeathersError('feathers.client.remote.services must be an array')
    }

    if (Array.isArray(remote.services)) {
      for (const service of remote.services) {
        if (!service || typeof (service as any).path !== 'string' || !(service as any).path.trim()) {
          throw new NuxtFeathersError('feathers.client.remote.services[] entries must have a non-empty "path"')
        }
      }
    }
  }

  return {
    mode,
    remote,
    pinia,
    ...resolvedPlugins,
  }
}
