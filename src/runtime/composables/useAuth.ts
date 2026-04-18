import { useNuxtApp } from '#imports'
import { computed } from 'vue'
import { useAuthRuntime } from './useAuthRuntime'

export function useAuth() {
  const runtime = useAuthRuntime()
  const nuxtApp = useNuxtApp() as any

  const isSsoAuthenticated = computed(() => runtime.provider.value === 'keycloak' && runtime.authenticated.value)
  const isFeathersAuthenticated = computed(() => runtime.authenticated.value)
  const isAuthenticated = computed(() => runtime.authenticated.value)
  const ssoUser = computed(() => runtime.provider.value === 'keycloak' ? runtime.user.value : null)
  const feathersUser = computed(() => runtime.user.value)
  const ssoToken = computed(() => runtime.provider.value === 'keycloak' ? runtime.accessToken.value : null)
  const feathersToken = computed(() => runtime.accessToken.value)

  async function init() {
    await runtime.ensureReady()
  }

  async function login(options?: any) {
    if (runtime.provider.value === 'keycloak')
      return nuxtApp.$keycloak?.login?.(options)
    return runtime.authenticate(options)
  }

  async function logout(options?: any) {
    if (runtime.provider.value === 'keycloak')
      return nuxtApp.$keycloak?.logout?.(options)
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
    init,
    login,
    logout,
    ensureReady: runtime.ensureReady,
    getAuthorizationHeader: runtime.getAuthorizationHeader,
  }
}
