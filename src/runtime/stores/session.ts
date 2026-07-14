import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed } from 'vue'
import { useAuthRuntime } from '../composables/useAuthRuntime'

export interface NfzLoginCredentials {
  strategy?: string
  userId?: string
  email?: string
  username?: string
  password?: string
  [key: string]: unknown
}

export interface NfzSessionSetPayload {
  user?: unknown
  accessToken?: string | null
  authenticated?: boolean
  permissions?: unknown[]
  error?: unknown
}

function extractUserId(user: any): string | null {
  return user?.userId
    ?? user?.email
    ?? user?.username
    ?? user?.preferred_username
    ?? user?.id
    ?? user?._id
    ?? null
}

export const useSessionStore = defineStore('nfz-session', () => {
  const runtime = useAuthRuntime()

  const isReady = computed(() => runtime.ready.value)
  const isBootstrapping = computed(() => runtime.bootstrapping.value)
  const isAuthenticated = computed(() => runtime.authenticated.value)
  const isAnonymous = computed(() => runtime.ready.value && !runtime.authenticated.value)
  const userId = computed(() => extractUserId(runtime.user.value))
  const hasToken = computed(() => Boolean(runtime.accessToken.value))

  function hasPermission(permission: string): boolean {
    return runtime.permissions.value.some((value: any) => String(value) === permission)
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => hasPermission(permission))
  }

  async function restore(reason = 'session-store') {
    await runtime.ensureReady(reason)
  }

  async function login(credentials: NfzLoginCredentials) {
    const payload = {
      strategy: credentials.strategy || 'local',
      ...credentials,
    }
    return runtime.authenticate(payload)
  }

  async function logout() {
    await runtime.logout()
  }

  async function setSession(payload: NfzSessionSetPayload, source: 'runtime' | 'storage' | 'authenticate' = 'runtime') {
    await runtime.setSession(payload, source)
  }

  return {
    provider: runtime.provider,
    status: runtime.status,
    ready: runtime.ready,
    bootstrapping: runtime.bootstrapping,
    authenticated: runtime.authenticated,
    accessToken: runtime.accessToken,
    user: runtime.user,
    permissions: runtime.permissions,
    tokenSource: runtime.tokenSource,
    error: runtime.error,
    events: runtime.events,
    isReady,
    isBootstrapping,
    isAuthenticated,
    isAnonymous,
    hasToken,
    userId,
    hasPermission,
    hasAnyPermission,
    restore,
    ensureReady: runtime.ensureReady,
    login,
    authenticate: runtime.authenticate,
    reAuthenticate: runtime.reAuthenticate,
    logout,
    setSession,
    getAuthorizationHeader: runtime.getAuthorizationHeader,
    getStateSnapshot: runtime.getStateSnapshot,
    clearEvents: runtime.clearEvents,
    resetDiagnostics: runtime.resetDiagnostics,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useSessionStore, import.meta.hot))
