import { useRequestURL, useRuntimeConfig } from '#app'
import { feathers } from '@feathersjs/feathers'

import type { ClientApplication } from '../client'
import type { NfzClientPluginConfig } from './types'

import { connection } from '#build/feathers/client/connection'
import { authentication } from '#build/feathers/client/authentication'
import { getPublicClientMode, getPublicRemoteConfig } from '../utils/config'

const STANDARD_METHODS = new Set(['find', 'get', 'create', 'update', 'patch', 'remove'])

export function createFeathersClient(config: NfzClientPluginConfig): ClientApplication {
  const runtime = useRuntimeConfig()
  const clientMode = getPublicClientMode(runtime.public as any)
  const remoteConfig = getPublicRemoteConfig(runtime.public as any)
  const browserOrigin = import.meta.client && typeof window !== 'undefined' ? window.location.origin : ''
  const requestOrigin = import.meta.server ? useRequestURL().origin : ''
  const embeddedBaseUrl = browserOrigin || requestOrigin

  const baseUrl = clientMode === 'remote'
    ? (remoteConfig?.url || embeddedBaseUrl)
    : embeddedBaseUrl

  const overrides = clientMode === 'remote'
    ? {
        mode: 'remote' as const,
        restPath: remoteConfig?.restPath,
        websocketPath: remoteConfig?.websocketPath,
        transport: remoteConfig?.transport || 'auto',
      }
    : {
        mode: clientMode,
        transport: remoteConfig?.transport,
      }

  const feathersClient: ClientApplication = feathers()
  feathersClient.configure(connection(baseUrl, overrides))

  if (config.authEnabled)
    feathersClient.configure(authentication)

  if (clientMode === 'remote' && Array.isArray(config.remoteServices) && config.remoteServices.length) {
    const conn = (feathersClient as any).get?.('connection')

    for (const svc of config.remoteServices) {
      const path = String(svc?.path || '').trim()
      if (!path)
        continue

      const methods = Array.isArray(svc.methods) ? svc.methods.filter(Boolean) : []
      const hasCustomMethods = methods.some(method => !STANDARD_METHODS.has(String(method)))

      if (!hasCustomMethods)
        continue

      try {
        const remote = conn?.service ? conn.service(path) : undefined
        if (remote) {
          ;(feathersClient as any).use(path, remote, { methods })
        }
      }
      catch {
        // no-op
      }
    }
  }

  for (const registerService of config.services)
    feathersClient.configure(registerService)

  for (const registerPlugin of config.plugins)
    feathersClient.configure(registerPlugin)

  return feathersClient
}
