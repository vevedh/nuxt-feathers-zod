import { useNuxtApp, useRuntimeConfig } from '#imports'
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { buildRemoteAuthPayload } from '../utils/auth'
import { getForcedAuthProvider, getPublicClientMode, getPublicRemoteAuthConfig, hasPublicKeycloakConfig, isPublicRemoteAuthEnabled } from '../utils/config'

type AuthProvider = 'keycloak' | 'local' | 'remote' | 'none'

export function useAuth() {
  const nuxtApp = useNuxtApp()
  const rc = useRuntimeConfig()
  const pub = rc.public as any

  const provider = computed<AuthProvider>(() => {
    // Allow an explicit override via env/runtimeConfig.
    // Note: `NUXT_PUBLIC_FEATHERS_AUTH_PROVIDER=keycloak` becomes `public.FEATHERS_AUTH_PROVIDER`.
    const forced = getForcedAuthProvider(pub)
    if (forced === 'keycloak')
      return 'keycloak'
    if (forced === 'remote')
      return 'remote'
    if (forced === 'local')
      return 'local'

    const cm = getPublicClientMode(pub)
    const remoteAuth = getPublicRemoteAuthConfig(pub)

    // Hybrid mode: Keycloak SSO + remote Feathers auth.
    // If Keycloak is configured, prefer it when remote auth payload is keycloak.
    if (hasPublicKeycloakConfig(pub) && cm === 'remote' && remoteAuth?.enabled && remoteAuth?.payloadMode === 'keycloak')
      return 'keycloak'

    if (isPublicRemoteAuthEnabled(pub))
      return 'remote'
    if (hasPublicKeycloakConfig(pub))
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
    if (provider.value === 'local' || provider.value === 'remote')
      return Boolean(authStore.value?.authenticated)
    return false
  })

  const user = computed(() => {
    if (provider.value === 'keycloak')
      return keycloak.value?.user ?? null
    if (provider.value === 'local' || provider.value === 'remote')
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
    if (provider.value === 'local' || provider.value === 'remote')
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

    // Local/Remote auth: attempt restore if store supports it, otherwise try api.reAuthenticate
    if (provider.value === 'local' || provider.value === 'remote') {
      const s: any = authStore.value
      if (s?.restore) {
        await s.restore().catch(() => {})
      }
      else {
        const api: any = (nuxtApp as any).$api
        await api?.reAuthenticate?.().catch(() => {})
      }
    }

    ready.value = true
  }

  async function login(options?: any) {
    if (provider.value === 'keycloak')
      return keycloak.value?.login?.(options)
    if (provider.value === 'local')
      return (authStore.value as any)?.login?.(options)
    if (provider.value === 'remote') {
      const pub = (useRuntimeConfig().public as any)
      const ra = getPublicRemoteAuthConfig(pub)
      const token = options?.token || options?.accessToken || options?.access_token
      if (!token)
        throw new Error('Remote login requires a token (options.token)')
      const payload = buildRemoteAuthPayload(token, ra)
      return (authStore.value as any)?.authenticate?.(payload)
    }
  }

  async function logout(options?: any) {
    if (provider.value === 'keycloak')
      return keycloak.value?.logout?.(options)
    if (provider.value === 'local')
      return (authStore.value as any)?.logout?.(options)
    if (provider.value === 'remote')
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
