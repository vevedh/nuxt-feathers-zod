import { buildLocalAuthPayload } from 'nuxt-feathers-zod/auth-utils'
import { acceptHMRUpdate, defineStore } from 'pinia'
import type { LoginCredentials, StudioUser } from '~/types/auth'

function normalizeRoles(user: StudioUser | null | undefined): string[] {
  if (!user?.roles)
    return []
  return user.roles.map(role => String(role))
}

export const useStudioSessionStore = defineStore('studioSession', () => {
  const nfzSession = useSessionStore()
  const runtimeConfig = useRuntimeConfig()

  const ready = computed(() => nfzSession.ready)
  const loading = computed(() => nfzSession.bootstrapping)
  const authenticated = computed(() => nfzSession.authenticated)
  const accessToken = computed(() => nfzSession.accessToken)
  const user = computed<StudioUser | null>(() => (nfzSession.user) ?? null)
  const roles = computed<string[]>(() => normalizeRoles(user.value))
  const userLabel = computed(() => {
    return user.value?.userId
      ?? user.value?.email
      ?? user.value?.username
      ?? 'Utilisateur'
  })

  const isAdmin = computed(() => roles.value.includes('admin'))

  function hasRole(role: string): boolean {
    return roles.value.includes(role)
  }

  function hasAnyRole(requiredRoles: string[] = []): boolean {
    if (!requiredRoles.length)
      return true
    return requiredRoles.some(role => hasRole(role))
  }

  async function restore(reason = 'studio-session-store'): Promise<void> {
    await nfzSession.ensureReady(reason)
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    const publicFeathers = (runtimeConfig.public as any)._feathers
    const localAuth = publicFeathers?.auth?.local
    const payload = buildLocalAuthPayload(credentials.userId, credentials.password, localAuth)

    await nfzSession.login(payload)
  }

  async function logout(): Promise<void> {
    await nfzSession.logout()
    await navigateTo('/login')
  }

  async function getAuthorizationHeader(): Promise<string | null> {
    return await nfzSession.getAuthorizationHeader()
  }

  return {
    ready,
    loading,
    authenticated,
    accessToken,
    user,
    roles,
    userLabel,
    isAdmin,
    hasRole,
    hasAnyRole,
    restore,
    login,
    logout,
    getAuthorizationHeader,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useStudioSessionStore, import.meta.hot))
