import type { NuxtApp } from '#app'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import type { NfzClientPluginConfig } from './types'

type FeathersPiniaClientConfig = Record<string, unknown>

import { createFeathersClient } from './createFeathersClient'
import { remoteAuthenticate } from './remote-auth'
import { waitForPinia } from './wait-for-pinia'
import { wrapApiServices } from './wrap-api-services'
import { resolveCreatePiniaClient } from '../composables/pinia'
import { getPublicClientMode, getPublicRemoteConfig, getPublicRemoteAuthConfig } from '../utils/config'

export function defineNfzClientPlugin(config: NfzClientPluginConfig) {
  return defineNuxtPlugin(async (nuxtApp: NuxtApp) => {
    const feathersClient = createFeathersClient(config)
    const runtime = useRuntimeConfig()
    const mode = getPublicClientMode(runtime.public as any)
    const remoteAuth = getPublicRemoteAuthConfig(runtime.public as any)

    let piniaClient: unknown

    if (config.piniaEnabled) {
      const piniaOptions = runtime.public._feathers.pinia
      const piniaInstance = await waitForPinia(nuxtApp as NuxtApp & { $pinia?: unknown })

      if (!piniaInstance) {
        console.warn(
          '[nuxt-feathers-zod] Feathers-Pinia is enabled but no Pinia instance was found. '
          + 'Install @pinia/nuxt or disable feathers.client.pinia.',
        )
      }
      else {
        const createPiniaClient = await resolveCreatePiniaClient()
        const serializablePiniaOptions = (
          piniaOptions && typeof piniaOptions === 'object'
            ? piniaOptions
            : {}
        ) as FeathersPiniaClientConfig & { idField?: string }

        piniaClient = createPiniaClient(feathersClient as any, {
          ...serializablePiniaOptions,
          idField: typeof serializablePiniaOptions.idField === 'string'
            ? serializablePiniaOptions.idField
            : 'id',
          ssr: mode === 'remote' ? false : !!import.meta.server,
          pinia: piniaInstance as any,
        } as any)
      }
    }

    if (import.meta.client && mode === 'remote' && remoteAuth?.enabled) {
      await remoteAuthenticate(feathersClient, nuxtApp)

      const socket = (feathersClient as any).get?.('socket')
      if (socket?.on) {
        socket.on('connect', () => void remoteAuthenticate(feathersClient, nuxtApp))
        socket.on('reconnect', () => void remoteAuthenticate(feathersClient, nuxtApp))
      }
    }

    const api = wrapApiServices((piniaClient || feathersClient) as any)

    if (import.meta.dev && mode === 'remote') {
      try {
        console.info('[NFZ CLIENT]', {
          mode,
          apiType: piniaClient ? 'pinia-client' : 'feathers-client',
          socketCreated: Boolean((feathersClient as any).get?.('socket')),
          socketConnected: Boolean((feathersClient as any).get?.('socket')?.connected),
          remoteUrl: getPublicRemoteConfig(runtime.public as any)?.url,
          remoteRestPath: getPublicRemoteConfig(runtime.public as any)?.restPath,
          remoteWebsocketPath: getPublicRemoteConfig(runtime.public as any)?.websocketPath,
          remoteServices: getPublicRemoteConfig(runtime.public as any)?.services,
        })
      }
      catch {
        // no-op
      }
    }

    return {
      provide: {
        api,
        client: feathersClient,
        feathersClient,
        piniaClient,
      },
    }
  })
}
