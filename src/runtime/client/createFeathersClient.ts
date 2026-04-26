import { useRequestURL, useRuntimeConfig } from '#app'

import type { ClientApplication } from '../client'
import type { NfzClientPluginConfig } from './types'

import { connection } from '#build/feathers/client/connection'
import { authentication } from '#build/feathers/client/authentication'
import { getPublicClientMode, getPublicRemoteConfig } from '../utils/config'

const STANDARD_METHODS = new Set(['find', 'get', 'create', 'update', 'patch', 'remove'])

type Listener = (...args: any[]) => void

type DefaultServiceFactory = (path: string) => any

function normalizeServicePath(path: string): string {
  return String(path || '').replace(/^\/+/, '').replace(/\/+$/, '')
}

class NativeFeathersClient {
  private readonly settings = new Map<string, any>()
  private readonly services = new Map<string, any>()
  private readonly listeners = new Map<string, Set<Listener>>()
  private defaultServiceFactory: DefaultServiceFactory | null = null

  authentication?: any
  authenticate?: (payload: any, params?: any) => Promise<any>
  reAuthenticate?: (force?: boolean, strategy?: string) => Promise<any>
  logout?: (params?: any) => Promise<any>

  configure(plugin: any): this {
    if (typeof plugin === 'function')
      plugin(this)
    else if (plugin && typeof plugin.configure === 'function')
      plugin.configure(this)
    return this
  }

  set(name: string, value: any): this {
    this.settings.set(name, value)
    ;(this as any)[name] = value
    return this
  }

  get(name: string): any {
    return this.settings.get(name)
  }

  use(path: string, service: any): this {
    const normalized = normalizeServicePath(path)
    this.services.set(normalized, service)
    return this
  }

  service(path: string): any {
    const normalized = normalizeServicePath(path)
    const existing = this.services.get(normalized)
    if (existing)
      return existing

    if (this.defaultServiceFactory) {
      const service = this.defaultServiceFactory(normalized)
      this.services.set(normalized, service)
      return service
    }

    const connection = this.get('connection')
    if (connection && typeof connection.service === 'function') {
      const service = connection.service(normalized)
      this.services.set(normalized, service)
      return service
    }

    throw new Error(`[nuxt-feathers-zod] Service not found: ${normalized}`)
  }

  setDefaultService(factory: DefaultServiceFactory): this {
    this.defaultServiceFactory = factory
    return this
  }

  on(event: string, listener: Listener): this {
    const listeners = this.listeners.get(event) || new Set<Listener>()
    listeners.add(listener)
    this.listeners.set(event, listeners)
    return this
  }

  once(event: string, listener: Listener): this {
    const wrapped: Listener = (...args) => {
      this.off(event, wrapped)
      listener(...args)
    }
    return this.on(event, wrapped)
  }

  off(event: string, listener?: Listener): this {
    if (!listener) {
      this.listeners.delete(event)
      return this
    }

    const listeners = this.listeners.get(event)
    listeners?.delete(listener)
    return this
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.listeners.get(event)
    if (!listeners?.size)
      return false

    for (const listener of listeners)
      listener(...args)

    return true
  }
}

function createFeathersApplication(): ClientApplication {
  // Do not import @feathersjs/feathers in browser runtime files.
  // The official Feathers v5 package currently resolves to CommonJS in some
  // Nuxt/Vite tarball scenarios, especially with Nuxt 4.1.x, which can expose
  // raw `exports` to the browser. This minimal client implements the subset of
  // Feathers application APIs that NFZ generated clients need: configure, use,
  // service, set/get, auth helpers and basic event emitter methods.
  return new NativeFeathersClient() as unknown as ClientApplication
}

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

  const feathersClient = createFeathersApplication()
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
