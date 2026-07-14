import { useCookie, useNuxtApp, useRuntimeConfig } from '#imports'
import { computed, reactive, toRefs } from 'vue'
import type { NfzAuthEventType } from '../capabilities'
import { getAccessTokenFromResult } from '../utils/auth'
import { shouldTreatReauthAsAnonymous } from '../utils/auth-runtime'
import {
  getForcedAuthProvider,
  getPublicClientMode,
  getPublicRemoteAuthConfig,
  hasPublicKeycloakConfig,
  isPublicRemoteAuthEnabled,
} from '../utils/config'

export type AuthProvider = 'keycloak' | 'local' | 'remote' | 'none'
export type AuthStatus = 'idle' | 'bootstrapping' | 'authenticated' | 'anonymous' | 'error'
export type TokenSource =
  | 'none'
  | 'storage'
  | 'authenticate'
  | 'reauth'
  | 'keycloak-client'
  | 'keycloak-bridge'
  | 'keycloak-fallback'
  | 'runtime'
export type AuthSyncState = 'idle' | 'ok' | 'missing' | 'error'
export type AuthEventLevel = 'info' | 'warn' | 'error'
export type AuthEventType = NfzAuthEventType

export interface AuthRuntimeEvent {
  id: number
  at: number
  type: AuthEventType
  level: AuthEventLevel
  provider: AuthProvider
  authenticated: boolean
  ready: boolean
  tokenSource: TokenSource
  reason?: string
  message?: string
  details?: Record<string, any>
}

export interface SetSsoSessionPayload {
  provider?: 'keycloak' | string
  token?: string | null
  accessToken?: string | null
  user?: any
  authenticated?: boolean
  permissions?: any[]
  error?: any
}

export interface SetFeathersSessionPayload {
  accessToken?: string | null
  user?: any
  authentication?: any
  authenticated?: boolean
  permissions?: any[]
  error?: any
}

export interface BridgeSsoOptions {
  servicePath?: string
  strategy?: string
  tokenField?: string
  payload?: Record<string, any>
}

const AUTH_EVENT_LIMIT = 60

const state = reactive({
  provider: 'none' as AuthProvider,
  status: 'idle' as AuthStatus,
  ready: false,
  bootstrapping: false,
  authenticated: false,
  ssoAuthenticated: false,
  feathersAuthenticated: false,
  accessToken: null as string | null,
  user: null as any,
  ssoToken: null as string | null,
  ssoUser: null as any,
  feathersToken: null as string | null,
  feathersUser: null as any,
  authentication: null as any,
  permissions: [] as any[],
  tokenSource: 'none' as TokenSource,
  error: null as any,
  lastSyncAt: 0,
  lastReadyAt: 0,
  lastAuthenticateAt: 0,
  lastReAuthenticateAt: 0,
  lastBridgeAt: 0,
  lastEnsureReason: 'init',
  bridgePath: '',
  clientSync: {
    api: 'idle' as AuthSyncState,
    client: 'idle' as AuthSyncState,
    feathersClient: 'idle' as AuthSyncState,
  },
  events: [] as AuthRuntimeEvent[],
})

let ensurePromise: Promise<void> | null = null
let eventCounter = 0

function resolveProvider(pub: any): AuthProvider {
  const forced = getForcedAuthProvider(pub)
  if (forced === 'keycloak')
    return 'keycloak'
  if (forced === 'remote')
    return 'remote'
  if (forced === 'local')
    return 'local'

  const cm = getPublicClientMode(pub)
  const remoteAuth = getPublicRemoteAuthConfig(pub)

  if (hasPublicKeycloakConfig(pub) && cm === 'remote' && remoteAuth?.enabled && remoteAuth?.payloadMode === 'keycloak')
    return 'keycloak'

  if (isPublicRemoteAuthEnabled(pub))
    return 'remote'
  if (hasPublicKeycloakConfig(pub))
    return 'keycloak'
  if (pub?._feathers?.auth)
    return 'local'
  return 'none'
}

function getStorageKey(pub: any): string {
  return pub?._feathers?.client?.remote?.auth?.storageKey
    || pub?._feathers?.auth?.client?.storageKey
    || 'feathers-jwt'
}

function readWindowStorage(storageKey: string): string | null {
  if (typeof window === 'undefined')
    return null
  try {
    return window.localStorage.getItem(storageKey)
      || window.localStorage.getItem('feathers-jwt')
      || window.localStorage.getItem('accessToken')
      || null
  }
  catch {
    return null
  }
}

function writeWindowStorage(storageKey: string, token: string | null) {
  if (typeof window === 'undefined')
    return
  try {
    if (token) {
      window.localStorage.setItem(storageKey, token)
      window.localStorage.setItem('accessToken', token)
    }
    else {
      window.localStorage.removeItem(storageKey)
      window.localStorage.removeItem('feathers-jwt')
      window.localStorage.removeItem('accessToken')
    }
  }
  catch {}
}

function normalizeServicePath(path: string | undefined | null): string {
  return String(path || 'authentication').replace(/^\/+/, '')
}

function getKeycloakToken(nuxtApp: any): string | null {
  const keycloak = nuxtApp?.$keycloak
  if (!keycloak)
    return null
  const token = typeof keycloak.token === 'function' ? keycloak.token() : keycloak.token
  return typeof token === 'string' && token ? token : null
}

function getKeycloakUser(nuxtApp: any): any {
  const keycloak = nuxtApp?.$keycloak
  if (!keycloak)
    return null
  return keycloak.user ?? keycloak.tokenParsed ?? null
}

function getPersistedToken(pub: any): string | null {
  const storageKey = getStorageKey(pub)
  const jwt = useCookie<string | null>(storageKey)
  return jwt.value || readWindowStorage(storageKey)
}

async function resolveAvailableAccessToken(api: any, pub: any): Promise<string | null> {
  try {
    const candidate = await api?.authentication?.getAccessToken?.()
    if (typeof candidate === 'string' && candidate)
      return candidate
  }
  catch {}

  return getPersistedToken(pub)
}

function syncRuntimeClients(nuxtApp: any, token: string | null) {
  const candidates = [
    ['api', nuxtApp?.$api],
    ['client', nuxtApp?.$client],
    ['feathersClient', nuxtApp?.$feathersClient],
  ] as const

  const report = {
    api: 'missing' as AuthSyncState,
    client: 'missing' as AuthSyncState,
    feathersClient: 'missing' as AuthSyncState,
  }

  for (const [name, client] of candidates) {
    if (!client) {
      report[name] = 'missing'
      continue
    }

    try {
      if (token && typeof client.authentication?.setAccessToken === 'function')
        client.authentication.setAccessToken(token)
      if (!token && typeof client.authentication?.removeAccessToken === 'function')
        client.authentication.removeAccessToken()
      if (typeof client.set === 'function')
        client.set('accessToken', token)
      report[name] = 'ok'
    }
    catch {
      report[name] = 'error'
    }
  }

  return report
}

function refreshDerivedSession() {
  state.feathersAuthenticated = Boolean(state.feathersToken || state.feathersUser)
  state.ssoAuthenticated = Boolean(state.ssoToken || state.ssoUser)
  state.authenticated = state.feathersAuthenticated || state.ssoAuthenticated
  state.accessToken = state.feathersToken || state.ssoToken || null
  state.user = state.feathersUser || state.ssoUser || null
  state.status = state.authenticated ? 'authenticated' : (state.error ? 'error' : 'anonymous')
}

function pushEvent(input: {
  type: AuthEventType
  level?: AuthEventLevel
  reason?: string
  message?: string
  details?: Record<string, any>
}) {
  const event: AuthRuntimeEvent = {
    id: ++eventCounter,
    at: Date.now(),
    type: input.type,
    level: input.level || 'info',
    provider: state.provider,
    authenticated: state.authenticated,
    ready: state.ready,
    tokenSource: state.tokenSource,
    reason: input.reason,
    message: input.message,
    details: input.details,
  }
  state.events.unshift(event)
  if (state.events.length > AUTH_EVENT_LIMIT)
    state.events.splice(AUTH_EVENT_LIMIT)
  return event
}

export function useAuthRuntime() {
  const nuxtApp = useNuxtApp()
  const pub = useRuntimeConfig().public as any

  const provider = computed<AuthProvider>(() => resolveProvider(pub))
  state.provider = provider.value

  async function setFeathersSession(payload: SetFeathersSessionPayload = {}, source: TokenSource = 'runtime') {
    if (import.meta.server)
      return

    const storageKey = getStorageKey(pub)
    const token = payload.accessToken ?? null
    state.feathersUser = payload.user ?? null
    state.authentication = payload.authentication ?? null
    state.feathersToken = token
    state.permissions = Array.isArray(payload.permissions) ? payload.permissions : []
    state.error = payload.error ?? null
    state.tokenSource = source
    state.lastSyncAt = Date.now()
    refreshDerivedSession()

    const jwt = useCookie<string | null>(storageKey)
    jwt.value = token
    writeWindowStorage(storageKey, token)
    state.clientSync = syncRuntimeClients(nuxtApp, token)

    if (nuxtApp.$pinia?._s?.get?.('auth')) {
      const store = nuxtApp.$pinia._s.get('auth')
      store.user = state.user
      store.accessToken = state.accessToken
      store.authenticated = state.authenticated
      store.error = state.error
    }

    pushEvent({
      type: 'feathers-session-sync',
      reason: source,
      details: {
        hasAccessToken: Boolean(token),
        hasUser: Boolean(state.feathersUser),
        clientSync: { ...state.clientSync },
      },
    })
  }

  async function setSsoSession(payload: SetSsoSessionPayload = {}, source: TokenSource = 'keycloak-client') {
    if (import.meta.server)
      return

    const token = payload.token ?? payload.accessToken ?? null
    state.ssoToken = token
    state.ssoUser = payload.user ?? null
    if (Array.isArray(payload.permissions) && !state.feathersAuthenticated)
      state.permissions = payload.permissions
    state.error = payload.error ?? null
    state.tokenSource = source
    state.lastSyncAt = Date.now()
    refreshDerivedSession()

    pushEvent({
      type: 'sso-session-sync',
      reason: source,
      details: {
        provider: payload.provider || 'keycloak',
        hasSsoToken: Boolean(token),
        hasSsoUser: Boolean(state.ssoUser),
        feathersAuthenticated: state.feathersAuthenticated,
      },
    })
  }

  async function setSession(payload: SetFeathersSessionPayload = {}, source: TokenSource = 'runtime') {
    await setFeathersSession(payload, source)
  }

  async function authenticate(payload: any) {
    const api: any = nuxtApp.$api
    const result = await api.authenticate(payload)
    const accessToken = getAccessTokenFromResult(result) || await resolveAvailableAccessToken(api, pub)
    state.lastAuthenticateAt = Date.now()
    await setFeathersSession({
      accessToken,
      user: result?.user ?? null,
      authentication: result?.authentication ?? null,
      authenticated: true,
      permissions: result?.permissions ?? [],
      error: null,
    }, 'authenticate')
    state.ready = true
    pushEvent({
      type: 'authenticate',
      reason: payload?.strategy || provider.value,
      details: {
        strategy: payload?.strategy || null,
        hasAccessToken: Boolean(accessToken),
      },
    })
    return result
  }

  async function reAuthenticate() {
    const api: any = nuxtApp.$api
    const availableToken = await resolveAvailableAccessToken(api, pub)

    if (!availableToken) {
      state.lastReAuthenticateAt = Date.now()
      await setFeathersSession({ accessToken: null, user: null, authenticated: false, permissions: [], error: null }, 'none')
      pushEvent({ type: 'reauth-skipped', reason: 'reauth', message: 'No access token available; staying anonymous' })
      return null
    }

    try {
      const result = await api.reAuthenticate()
      const accessToken = getAccessTokenFromResult(result) || await resolveAvailableAccessToken(api, pub)
      state.lastReAuthenticateAt = Date.now()
      await setFeathersSession({
        accessToken,
        user: result?.user ?? null,
        authentication: result?.authentication ?? null,
        authenticated: true,
        permissions: result?.permissions ?? [],
        error: null,
      }, 'reauth')
      pushEvent({ type: 'reauth-success', reason: 'reauth', details: { hasAccessToken: Boolean(accessToken) } })
      return result
    }
    catch (error: any) {
      if (shouldTreatReauthAsAnonymous(error, availableToken)) {
        await setFeathersSession({ accessToken: null, user: null, authenticated: false, permissions: [], error: null }, 'none')
        pushEvent({ type: 'reauth-skipped', reason: 'reauth', message: 'No access token available; staying anonymous' })
        return null
      }

      await setFeathersSession({ accessToken: null, user: null, authenticated: false, permissions: [], error }, 'reauth')
      pushEvent({ type: 'reauth-failure', level: 'warn', reason: 'reauth', message: error?.message || 'reAuthenticate failed' })
      return null
    }
  }

  async function logout() {
    const api: any = nuxtApp.$api
    let logoutError: any = null
    try {
      await api.logout?.()
    }
    catch (error) {
      logoutError = error
      state.error = error
    }

    state.ssoToken = null
    state.ssoUser = null
    await setFeathersSession({
      accessToken: null,
      user: null,
      authentication: null,
      authenticated: false,
      permissions: [],
      error: logoutError,
    }, 'runtime')
    refreshDerivedSession()
    state.ready = true
    pushEvent({ type: 'logout', level: logoutError ? 'warn' : 'info', message: logoutError?.message })
  }

  async function synchronizeKeycloakSession(reason = 'keycloak-runtime', hint: {
    token?: string | null
    user?: any
    tokenParsed?: any
    permissions?: any[]
    loginuser?: string | null
  } = {}) {
    if (import.meta.server)
      return false

    const token = hint.token ?? getKeycloakToken(nuxtApp)
    const keycloakUser = hint.user ?? hint.tokenParsed ?? getKeycloakUser(nuxtApp)

    if (!token && !keycloakUser) {
      await setSsoSession({ token: null, user: null, authenticated: false, permissions: [], error: null }, 'keycloak-fallback')
      state.ready = true
      pushEvent({ type: 'keycloak-bridge-fallback', level: 'warn', reason, message: 'No Keycloak token/user available' })
      return false
    }

    await setSsoSession({
      provider: 'keycloak',
      token,
      user: keycloakUser ?? null,
      authenticated: Boolean(token || keycloakUser),
      permissions: hint.permissions ?? [],
      error: null,
    }, 'keycloak-client')
    state.ready = true
    pushEvent({
      type: 'keycloak-client-session',
      reason,
      details: {
        hasSsoToken: Boolean(token),
        hasSsoUser: Boolean(keycloakUser),
        loginuser: hint.loginuser ?? keycloakUser?.preferred_username ?? keycloakUser?.userid ?? null,
      },
    })
    return true
  }

  async function bridgeSso(options: BridgeSsoOptions = {}) {
    if (import.meta.server)
      return null

    const api: any = nuxtApp.$api
    if (!api)
      throw new Error('[nuxt-feathers-zod] Cannot bridge SSO: Feathers client is unavailable')

    const token = state.ssoToken || getKeycloakToken(nuxtApp)
    if (!token)
      throw new Error('[nuxt-feathers-zod] Cannot bridge SSO: SSO token is unavailable')

    const servicePath = normalizeServicePath(options.servicePath || 'authentication')
    const strategy = options.strategy || 'keycloak-ldap'
    const tokenField = options.tokenField || 'access_token'
    const payload = {
      strategy,
      [tokenField]: token,
      ...(options.payload || {}),
    }

    const result = typeof api.service === 'function'
      ? await api.service(servicePath).create(payload)
      : await api.authenticate?.(payload)
    const accessToken = getAccessTokenFromResult(result)

    await setFeathersSession({
      accessToken,
      user: result?.user ?? null,
      authentication: result?.authentication ?? null,
      authenticated: Boolean(accessToken || result?.user),
      permissions: result?.permissions ?? [],
      error: null,
    }, 'keycloak-bridge')
    state.bridgePath = servicePath
    state.lastBridgeAt = Date.now()
    state.ready = true
    pushEvent({
      type: 'keycloak-bridge-success',
      reason: strategy,
      details: {
        bridgePath: servicePath,
        hasFeathersToken: Boolean(accessToken),
        hasFeathersUser: Boolean(result?.user),
      },
    })
    return result
  }

  async function ensureValidatedBearer(reason = 'validate-bearer') {
    await ensureReady(reason)

    const token = state.feathersToken || state.ssoToken
    if (!token) {
      pushEvent({ type: 'keycloak-bearer-missing', level: 'warn', reason, message: 'No token available for protected call' })
      return false
    }

    if (state.provider === 'keycloak') {
      const keycloak = nuxtApp.$keycloak
      if (keycloak?.authenticated) {
        await synchronizeKeycloakSession(reason, {
          token: getKeycloakToken(nuxtApp),
          user: getKeycloakUser(nuxtApp),
          tokenParsed: keycloak?.tokenParsed,
          permissions: keycloak?.permissions ?? state.permissions,
          loginuser: keycloak?.userid ?? keycloak?.tokenParsed?.preferred_username ?? null,
        }).catch(() => false)
      }
    }

    pushEvent({ type: 'keycloak-bearer-validated', reason, details: { provider: state.provider, hasToken: Boolean(token) } })
    return Boolean(token)
  }

  async function ensureReady(reason = 'ensure-ready') {
    if (import.meta.server) {
      state.ready = true
      return
    }

    if (state.ready && !state.bootstrapping)
      return

    if (ensurePromise)
      return ensurePromise

    ensurePromise = (async () => {
      state.provider = provider.value
      state.bootstrapping = true
      state.status = 'bootstrapping'
      state.lastEnsureReason = reason
      state.lastReadyAt = Date.now()
      pushEvent({ type: 'ensure-start', reason, details: { provider: state.provider } })

      if (state.provider === 'keycloak') {
        const keycloak = nuxtApp.$keycloak
        if (keycloak?.authenticated) {
          await synchronizeKeycloakSession('ensureReady', {
            token: getKeycloakToken(nuxtApp),
            user: getKeycloakUser(nuxtApp),
            tokenParsed: keycloak?.tokenParsed,
            permissions: keycloak?.permissions ?? [],
            loginuser: keycloak?.userid ?? keycloak?.tokenParsed?.preferred_username ?? null,
          })
        }
        else {
          await setSsoSession({ token: null, user: null, authenticated: false, permissions: [], error: null }, 'runtime')
          state.ready = true
        }
        return
      }

      if (state.provider === 'local' || state.provider === 'remote') {
        const candidateToken = await resolveAvailableAccessToken(nuxtApp.$api, pub)

        if (!candidateToken) {
          await setFeathersSession({ accessToken: null, user: null, authenticated: false, permissions: [], error: null }, 'none')
          state.ready = true
          pushEvent({
            type: 'reauth-skipped',
            reason: reason,
            message: 'No access token available at startup; staying anonymous',
          })
          return
        }

        await reAuthenticate()
        state.ready = true
        return
      }

      await setFeathersSession({ accessToken: null, user: null, authenticated: false, permissions: [], error: null }, 'runtime')
      state.ready = true
    })().finally(() => {
      state.bootstrapping = false
      refreshDerivedSession()
      pushEvent({
        type: 'ensure-finish',
        reason: state.lastEnsureReason,
        details: {
          status: state.status,
          ready: state.ready,
          authenticated: state.authenticated,
        },
      })
      ensurePromise = null
    })

    return ensurePromise
  }

  async function getAuthorizationHeader() {
    await ensureReady('get-authorization-header')

    if (!state.feathersToken && state.provider !== 'keycloak') {
      const token = await resolveAvailableAccessToken(nuxtApp.$api, pub)
      if (token) {
        await setFeathersSession({
          accessToken: token,
          user: state.feathersUser,
          authenticated: state.feathersAuthenticated || Boolean(state.feathersUser),
          permissions: state.permissions,
          error: null,
        }, state.tokenSource === 'none' ? 'storage' : state.tokenSource)
      }
    }

    const token = state.feathersToken || state.ssoToken
    return token ? `Bearer ${token}` : null
  }

  function clearEvents() {
    state.events.splice(0)
  }

  function resetDiagnostics() {
    state.error = null
    state.lastEnsureReason = 'reset'
    state.lastReadyAt = 0
    state.lastAuthenticateAt = 0
    state.lastReAuthenticateAt = 0
    state.lastBridgeAt = 0
    state.clientSync = {
      api: 'idle',
      client: 'idle',
      feathersClient: 'idle',
    }
    clearEvents()
  }

  function getStateSnapshot() {
    return {
      provider: state.provider,
      status: state.status,
      ready: state.ready,
      bootstrapping: state.bootstrapping,
      authenticated: state.authenticated,
      ssoAuthenticated: state.ssoAuthenticated,
      feathersAuthenticated: state.feathersAuthenticated,
      accessToken: state.accessToken,
      user: state.user,
      ssoToken: state.ssoToken,
      ssoUser: state.ssoUser,
      feathersToken: state.feathersToken,
      feathersUser: state.feathersUser,
      authentication: state.authentication,
      permissions: state.permissions,
      tokenSource: state.tokenSource,
      error: state.error,
      lastSyncAt: state.lastSyncAt,
      lastReadyAt: state.lastReadyAt,
      lastAuthenticateAt: state.lastAuthenticateAt,
      lastReAuthenticateAt: state.lastReAuthenticateAt,
      lastBridgeAt: state.lastBridgeAt,
      lastEnsureReason: state.lastEnsureReason,
      bridgePath: state.bridgePath,
      clientSync: { ...state.clientSync },
      events: state.events.map(event => ({ ...event })),
    }
  }

  return {
    ...toRefs(state),
    provider,
    ensureReady,
    authenticate,
    reAuthenticate,
    logout,
    setSession,
    setSsoSession,
    setFeathersSession,
    bridgeSso,
    synchronizeKeycloakSession,
    ensureValidatedBearer,
    getAuthorizationHeader,
    getStateSnapshot,
    clearEvents,
    resetDiagnostics,
    pushEvent,
  }
}
