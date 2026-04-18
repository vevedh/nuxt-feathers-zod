import { useCookie, useNuxtApp, useRuntimeConfig } from '#imports'
import { computed, reactive, toRefs } from 'vue'
import { buildRemoteAuthPayload, getAccessTokenFromResult } from '../utils/auth'
import { getForcedAuthProvider, getPublicClientMode, getPublicRemoteAuthConfig, hasPublicKeycloakConfig, isPublicRemoteAuthEnabled } from '../utils/config'

export type AuthProvider = 'keycloak' | 'local' | 'remote' | 'none'
export type AuthStatus = 'idle' | 'bootstrapping' | 'authenticated' | 'anonymous' | 'error'
export type TokenSource = 'none' | 'storage' | 'authenticate' | 'reauth' | 'keycloak-bridge' | 'keycloak-fallback' | 'runtime'
export type AuthSyncState = 'idle' | 'ok' | 'missing' | 'error'
export type AuthEventLevel = 'info' | 'warn' | 'error'
export type AuthEventType =
  | 'ensure-start'
  | 'ensure-finish'
  | 'session-sync'
  | 'authenticate'
  | 'reauth-success'
  | 'reauth-failure'
  | 'logout'
  | 'keycloak-bridge-success'
  | 'keycloak-bridge-fallback'
  | 'keycloak-bearer-validated'
  | 'keycloak-bearer-missing'
  | 'protected-page-ready'
  | 'protected-page-blocked'

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

const AUTH_EVENT_LIMIT = 60

const state = reactive({
  provider: 'none' as AuthProvider,
  status: 'idle' as AuthStatus,
  ready: false,
  bootstrapping: false,
  authenticated: false,
  accessToken: null as string | null,
  user: null as any,
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

  async function setSession(payload: {
    user?: any
    accessToken?: string | null
    authenticated?: boolean
    permissions?: any[]
    error?: any
  } = {}, source: TokenSource = 'runtime') {
    const storageKey = getStorageKey(pub)
    const token = payload.accessToken ?? null
    state.user = payload.user ?? null
    state.permissions = Array.isArray(payload.permissions) ? payload.permissions : []
    state.accessToken = token
    state.authenticated = payload.authenticated ?? Boolean(token || payload.user)
    state.error = payload.error ?? null
    state.tokenSource = source
    state.status = state.authenticated ? 'authenticated' : (payload.error ? 'error' : 'anonymous')
    state.lastSyncAt = Date.now()

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
      type: 'session-sync',
      reason: source,
      details: {
        authenticated: state.authenticated,
        hasAccessToken: Boolean(token),
        hasUser: Boolean(state.user),
        clientSync: { ...state.clientSync },
      },
    })
  }

  async function authenticate(payload: any) {
    const api: any = nuxtApp.$api
    const result = await api.authenticate(payload)
    state.lastAuthenticateAt = Date.now()
    await setSession({
      accessToken: getAccessTokenFromResult(result),
      user: result?.user ?? null,
      authenticated: true,
      permissions: result?.permissions ?? [],
      error: null,
    }, 'authenticate')
    state.ready = true
    pushEvent({ type: 'authenticate', reason: payload?.strategy || provider.value, details: { strategy: payload?.strategy || null } })
    return result
  }

  async function reAuthenticate() {
    const api: any = nuxtApp.$api
    try {
      const result = await api.reAuthenticate()
      state.lastReAuthenticateAt = Date.now()
      await setSession({
        accessToken: getAccessTokenFromResult(result),
        user: result?.user ?? null,
        authenticated: true,
        permissions: result?.permissions ?? [],
        error: null,
      }, 'reauth')
      state.ready = true
      pushEvent({ type: 'reauth-success', reason: 'reauth' })
      return result
    }
    catch (error: any) {
      await setSession({ accessToken: null, user: null, authenticated: false, permissions: [], error }, 'reauth')
      state.ready = true
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
    await setSession({ accessToken: null, user: null, authenticated: false, permissions: [], error: logoutError }, 'runtime')
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
    const api: any = nuxtApp.$api
    if (!api)
      return false

    const token = hint.token ?? getKeycloakToken(nuxtApp)
    const keycloakUser = hint.user ?? getKeycloakUser(nuxtApp)
    if (!token) {
      await setSession({ accessToken: null, user: keycloakUser ?? null, authenticated: false, permissions: [], error: null }, 'keycloak-fallback')
      pushEvent({ type: 'keycloak-bridge-fallback', level: 'warn', reason, message: 'No Keycloak token available' })
      return false
    }

    const remoteAuth = getPublicRemoteAuthConfig(pub)
    const clientMode = getPublicClientMode(pub)
    const keycloakCfg = pub?._feathers?.keycloak ?? {}
    const bridgePath = clientMode === 'remote' && remoteAuth?.enabled
      ? (remoteAuth?.servicePath || 'authentication')
      : (keycloakCfg?.authServicePath || '/_keycloak')
    state.bridgePath = normalizeServicePath(bridgePath)

    const payload = {
      ...buildRemoteAuthPayload(token, {
        ...(remoteAuth || {}),
        payloadMode: 'keycloak',
      }),
      accessToken: token,
      access_token: token,
      jwt: token,
      token,
      user: keycloakUser ?? undefined,
      keycloakUser: keycloakUser ?? undefined,
      tokenParsed: hint.tokenParsed ?? keycloakUser ?? undefined,
      authenticated: true,
      reason,
    }

    let result: any = null
    try {
      const servicePath = state.bridgePath || normalizeServicePath(bridgePath)
      if (typeof api.service === 'function')
        result = await api.service(servicePath).create(payload)
      else if (typeof api.authenticate === 'function')
        result = await api.authenticate(payload)

      await setSession({
        accessToken: getAccessTokenFromResult(result) || token,
        user: result?.user ?? keycloakUser ?? null,
        authenticated: true,
        permissions: result?.permissions ?? hint.permissions ?? [],
        error: null,
      }, 'keycloak-bridge')
      state.lastBridgeAt = Date.now()
      state.ready = true
      pushEvent({
        type: 'keycloak-bridge-success',
        reason,
        details: {
          bridgePath: state.bridgePath,
          validated: Boolean(result?.user ?? keycloakUser),
        },
      })
      return true
    }
    catch (error: any) {
      await setSession({
        accessToken: token,
        user: keycloakUser ?? null,
        authenticated: true,
        permissions: hint.permissions ?? [],
        error,
      }, 'keycloak-fallback')
      state.ready = true
      pushEvent({
        type: 'keycloak-bridge-fallback',
        level: 'warn',
        reason,
        message: error?.message || 'Keycloak bridge synchronization failed',
        details: { bridgePath: state.bridgePath },
      })
      return false
    }
  }

  async function ensureValidatedBearer(reason = 'validate-bearer') {
    await ensureReady(reason)
    if (!state.accessToken) {
      pushEvent({ type: 'keycloak-bearer-missing', level: 'warn', reason, message: 'No access token available for protected call' })
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

    pushEvent({ type: 'keycloak-bearer-validated', reason, details: { provider: state.provider, hasAccessToken: Boolean(state.accessToken) } })
    return Boolean(state.accessToken)
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
          const persisted = getPersistedToken(pub)
          if (persisted)
            await setSession({ accessToken: persisted, user: state.user, authenticated: true, permissions: state.permissions, error: null }, 'storage')
          else
            await setSession({ accessToken: null, user: null, authenticated: false, permissions: [], error: null }, 'runtime')
          state.ready = true
        }
        return
      }

      if (state.provider === 'local' || state.provider === 'remote') {
        const result = await reAuthenticate()
        if (!result) {
          const persisted = getPersistedToken(pub)
          if (persisted)
            await setSession({ accessToken: persisted, user: state.user, authenticated: true, permissions: state.permissions, error: null }, 'storage')
        }
        state.ready = true
        return
      }

      await setSession({ accessToken: null, user: null, authenticated: false, permissions: [], error: null }, 'runtime')
      state.ready = true
    })().finally(() => {
      state.bootstrapping = false
      pushEvent({ type: 'ensure-finish', reason: state.lastEnsureReason, details: { status: state.status, ready: state.ready, authenticated: state.authenticated } })
      ensurePromise = null
    })

    return ensurePromise
  }

  async function getAuthorizationHeader() {
    await ensureReady('get-authorization-header')
    return state.accessToken ? `Bearer ${state.accessToken}` : null
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
      accessToken: state.accessToken,
      user: state.user,
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
    synchronizeKeycloakSession,
    ensureValidatedBearer,
    getAuthorizationHeader,
    getStateSnapshot,
    clearEvents,
    resetDiagnostics,
    pushEvent,
  }
}
