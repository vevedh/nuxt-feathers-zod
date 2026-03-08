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
  /**
   * Client runtime mode.
   * - embedded: connect to the Nuxt/Nitro integrated Feathers server (same origin)
   * - remote: connect to an external Feathers server via URL
   */
  mode?: 'embedded' | 'remote'

  /**
   * Remote Feathers server settings (required when mode='remote').
   */
  remote?: {
    /** Base URL of the external Feathers server, e.g. https://api.example.com */
    url: string

    /** Transport preference for the browser client. */
    transport?: 'auto' | 'rest' | 'socketio'

    /** Optional override for REST base path (defaults to transports.rest.path) */
    restPath?: string

    /** Optional override for Socket.IO path (defaults to transports.websocket.path) */
    websocketPath?: string

        /** Remote authentication settings (Feathers authentication-client). */
        auth?: {
          /** Enable feathers authentication-client in remote mode. */
          enabled?: boolean

          /** Authentication service path (default: "authentication"). */
          servicePath?: string

          /**
           * Payload mode:
           * - jwt: uses { strategy, accessToken }
           * - keycloak: same as jwt but semantically indicates the token is a Keycloak access token
           */
          payloadMode?: 'jwt' | 'keycloak'

          /** Authentication strategy name (default: "jwt"). */
          strategy?: string

          /** Field name for the token in the payload (default: "accessToken"). */
          tokenField?: string

          /** Automatically call reAuthenticate() on client startup (default: true). */
          reauth?: boolean

          /** Storage key used by the authentication client (default: "feathers-jwt"). */
          storageKey?: string
        }

        /**
         * Explicit list of external services to register on the client in remote mode.
         * This is independent from local service scanning and does not rely on the manifest.
         */
        services?: Array<{
          /** Service path, e.g. "messages" */
          path: string
          /** Optional list of allowed methods (socket best-practice). */
          methods?: string[]
        }>
  }

  pinia?: PiniaOptions | boolean
}

export interface ResolvedClientOptions extends ResolvedPluginOptions {
  mode: 'embedded' | 'remote'
  /**
   * Remote settings are only meaningful when mode === 'remote'.
   * Keep it undefined otherwise (avoid nulls to prevent type incompatibilities).
   */
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

export async function resolveClientOptions(client: ModuleOptions['client'], mongodb: boolean, rootDir: string, srcDir: string): Promise<ResolvedClientOptionsOrDisabled> {
  if (client === false)
    return false

  let clientOptions: ClientOptions
  const clientDefaults = getClientDefaults()

  if (client === true || client === undefined) {
    clientOptions = clientDefaults
  }
  else if (typeof client === 'object') {
    // IMPORTANT: user options must take precedence over defaults.
    // Using defu(defaults, user) would override user-provided values (e.g. mode='remote').
    clientOptions = defu(preparePluginOptions(client), clientDefaults)
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
    if (!remote?.url || typeof remote.url !== 'string')
      throw new NuxtFeathersError('feathers.client.mode is "remote" but feathers.client.remote.url is missing')

    // Basic validation (do not over-restrict: allow localhost, http, https)
    if (!/^https?:\/\//.test(remote.url))
      throw new NuxtFeathersError('feathers.client.remote.url must start with http:// or https://')
  }

  // Remote-only sanity checks (guard against undefined remote)
  if (mode === 'remote' && remote) {
    // Remote auth sanity
    if (remote.auth?.enabled) {
      if (!remote.auth.servicePath)
        remote.auth.servicePath = 'authentication'
      if (!remote.auth.strategy)
        remote.auth.strategy = 'jwt'
      if (!remote.auth.tokenField)
        remote.auth.tokenField = remote.auth.payloadMode === 'keycloak' ? 'access_token' : 'accessToken'
      if (!remote.auth.storageKey)
        remote.auth.storageKey = 'feathers-jwt'
    }

    // Remote services sanity
    if (remote.services && !Array.isArray(remote.services))
      throw new NuxtFeathersError('feathers.client.remote.services must be an array')
    if (Array.isArray(remote.services)) {
      for (const svc of remote.services) {
        if (!svc || typeof (svc as any).path !== 'string' || !(svc as any).path.trim())
          throw new NuxtFeathersError('feathers.client.remote.services[] entries must have a non-empty "path"')
      }
    }
  }


  const resolvedClient: ResolvedClientOptions = {
    mode,
    remote,
    pinia,
    ...resolvedPlugins,
  }

  return resolvedClient
}
