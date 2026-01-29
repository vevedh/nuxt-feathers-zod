import { useNuxtApp, useRuntimeConfig } from '#imports'
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'

type AuthProvider = 'keycloak' | 'local' | 'none'

export function useAuth() {
  const nuxtApp = useNuxtApp()
  const rc = useRuntimeConfig()
  const pub = rc.public as any

  const provider = computed<AuthProvider>(() => {
    if (pub?._feathers?.keycloak)
      return 'keycloak'
    if (pub?._feathers?.auth)
      return 'local'
    return 'none'
  })

  const ready = ref(false)

  const keycloak = computed<any>(() => (nuxtApp as any).$keycloak)
  const authStore = computed(() => {
    try {
      return useAuthStore()
    }
    catch (e) {
      return null
    }
  })

  const isAuthenticated = computed(() => {
    if (provider.value === 'keycloak')
      return Boolean(keycloak.value?.authenticated)
    if (provider.value === 'local')
      return Boolean(authStore.value?.authenticated || authStore.value?.isAuthenticated)
    return false
  })

  const user = computed(() => {
    if (provider.value === 'keycloak')
      return keycloak.value?.user ?? null
    if (provider.value === 'local')
      return authStore.value?.user ?? null
    return null
  })

  const permissions = computed(() => {
    if (provider.value === 'keycloak')
      return keycloak.value?.permissions ?? []
    return []
  })

  const token = computed<string | null>(() => {
    if (provider.value === 'keycloak')
      return keycloak.value?.token?.() ?? null
    if (provider.value === 'local')
      return authStore.value?.accessToken ?? null
    return null
  })

  async function init() {
    if (import.meta.server)
      return

    // Allow retry when Keycloak is authenticated but user not materialized yet
    if (ready.value) {
      if (provider.value !== 'keycloak')
        return
      if (!isAuthenticated.value)
        return
      if (user.value)
        return
      // fallthrough: try to materialize user once we have a token and $api
    }

    // Keycloak: if authenticated, materialize user via bridge service
    if (provider.value === 'keycloak') {
      const kc = keycloak.value
      if (kc?.authenticated && typeof kc.whoami === 'function') {
        await kc.whoami().catch(() => null)
      }
    }

    // Local auth: attempt restore if store supports it
    if (provider.value === 'local') {
      const s: any = authStore.value
      if (s?.restore) {
        await s.restore().catch(() => {})
      }
    }

    ready.value = true
  }

  async function login(options?: any) {
    if (provider.value === 'keycloak')
      return keycloak.value?.login?.(options)
    if (provider.value === 'local')
      return (authStore.value as any)?.login?.(options)
  }

  async function logout(options?: any) {
    if (provider.value === 'keycloak')
      return keycloak.value?.logout?.(options)
    if (provider.value === 'local')
      return (authStore.value as any)?.logout?.(options)
  }

  return {
    provider,
    ready,
    isAuthenticated,
    user,
    permissions,
    token,
    init,
    login,
    logout,
  }
}
