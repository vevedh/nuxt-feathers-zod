import { useNuxtApp } from '#imports'
import { computed } from 'vue'
import { useAuthRuntime } from './useAuthRuntime'

export function useAuth() {
  const runtime = useAuthRuntime()
  const nuxtApp = useNuxtApp() as any

  const isSsoAuthenticated = computed(() => runtime.ssoAuthenticated.value)
  const isFeathersAuthenticated = computed(() => runtime.feathersAuthenticated.value)
  const isAuthenticated = computed(() => runtime.authenticated.value)
  const ssoUser = computed(() => runtime.ssoUser.value)
  const feathersUser = computed(() => runtime.feathersUser.value)
  const ssoToken = computed(() => runtime.ssoToken.value)
  const feathersToken = computed(() => runtime.feathersToken.value)

  async function init() {
    await runtime.ensureReady()
  }

  async function login(options?: any) {
    if (runtime.provider.value === 'keycloak')
      return nuxtApp.$keycloak?.login?.(options)
    return runtime.authenticate(options)
  }

  async function logout(options?: any) {
    if (runtime.provider.value === 'keycloak') {
      await runtime.logout()
      return nuxtApp.$keycloak?.logout?.(options)
    }
    return runtime.logout()
  }

  return {
    provider: runtime.provider,
    ready: runtime.ready,
    status: runtime.status,
    isAuthenticated,
    isSsoAuthenticated,
    isFeathersAuthenticated,
    user: runtime.user,
    ssoUser,
    feathersUser,
    permissions: runtime.permissions,
    token: runtime.accessToken,
    ssoToken,
    feathersToken,
    authentication: runtime.authentication,
    init,
    login,
    logout,
    ensureReady: runtime.ensureReady,
    bridgeSso: runtime.bridgeSso,
    setSsoSession: runtime.setSsoSession,
    setFeathersSession: runtime.setFeathersSession,
    getAuthorizationHeader: runtime.getAuthorizationHeader,
  }
}
