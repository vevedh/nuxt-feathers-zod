import { useNuxtApp, useRuntimeConfig } from '#imports'
import { computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { buildRemoteAuthPayload } from '../utils/auth'
import { getForcedAuthProvider, getPublicClientMode, getPublicRemoteAuthConfig, hasPublicKeycloakConfig, isPublicRemoteAuthEnabled } from '../utils/config'

type AuthProvider = 'keycloak' | 'local' | 'remote' | 'none'

export function useAuth() {
  const nuxtApp = useNuxtApp()
  const rc = useRuntimeConfig()
  const pub = rc.public

  const provider = computed<AuthProvider>(() => {
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
  })

  const ready = ref(false)

  const keycloak = computed<any>(() => (nuxtApp as any).$keycloak)
  const authStore = computed(() => {
    try {
      return useAuthStore()
    }
    catch {
      return null
    }
  })

  const ssoUser = computed(() => {
    const kc = keycloak.value
    return kc?.user ?? (kc?.tokenParsed ? { ...kc.tokenParsed, userid: kc.userid ?? kc.tokenParsed?.preferred_username } : null)
  })

  const feathersUser = computed(() => authStore.value?.user ?? null)

  const ssoToken = computed<string | null>(() => keycloak.value?.token?.() ?? null)
  const feathersToken = computed<string | null>(() => authStore.value?.accessToken ?? null)

  const isSsoAuthenticated = computed(() => {
    if (provider.value !== 'keycloak')
      return false
    return Boolean(keycloak.value?.authenticated)
  })

  const isFeathersAuthenticated = computed(() => {
    if (provider.value === 'keycloak')
      return Boolean(authStore.value?.authenticated || keycloak.value?.authenticated)
    if (provider.value === 'local' || provider.value === 'remote')
      return Boolean(authStore.value?.authenticated)
    return false
  })

  const isAuthenticated = computed(() => {
    if (provider.value === 'keycloak')
      return Boolean(isSsoAuthenticated.value || isFeathersAuthenticated.value)
    if (provider.value === 'local' || provider.value === 'remote')
      return Boolean(isFeathersAuthenticated.value)
    return false
  })

  const user = computed(() => {
    if (provider.value === 'keycloak')
      return feathersUser.value ?? ssoUser.value ?? null
    if (provider.value === 'local' || provider.value === 'remote')
      return feathersUser.value ?? null
    return null
  })

  const permissions = computed(() => {
    if (provider.value === 'keycloak')
      return keycloak.value?.permissions ?? []
    return []
  })

  const token = computed<string | null>(() => {
    if (provider.value === 'keycloak')
      return feathersToken.value ?? ssoToken.value ?? null
    if (provider.value === 'local' || provider.value === 'remote')
      return feathersToken.value ?? null
    return null
  })

  async function init() {
    if (import.meta.server)
      return

    if (ready.value) {
      if (provider.value !== 'keycloak')
        return
      if (!isAuthenticated.value)
        return
      if (user.value)
        return
    }

    if (provider.value === 'keycloak') {
      const kc = keycloak.value
      if (kc?.authenticated && typeof kc.ensureFeathersAuth === 'function')
        await kc.ensureFeathersAuth('useAuth.init').catch(() => false)
      if (kc?.authenticated && typeof kc.whoami === 'function')
        await kc.whoami().catch(() => null)
    }

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
      return authStore.value?.authenticate?.(options)
    if (provider.value === 'remote') {
      const pub = useRuntimeConfig().public
      const ra = getPublicRemoteAuthConfig(pub)
      const token = options?.token || options?.accessToken || options?.access_token
      if (!token)
        throw new Error('Remote login requires a token (options.token)')
      const payload = buildRemoteAuthPayload(token, ra)
      return authStore.value?.authenticate?.(payload)
    }
  }

  async function logout(options?: any) {
    if (provider.value === 'keycloak')
      return keycloak.value?.logout?.(options)
    if (provider.value === 'local')
      return authStore.value?.logout?.()
    if (provider.value === 'remote')
      return authStore.value?.logout?.()
  }

  return {
    provider,
    ready,
    isAuthenticated,
    isSsoAuthenticated,
    isFeathersAuthenticated,
    user,
    ssoUser,
    feathersUser,
    permissions,
    token,
    ssoToken,
    feathersToken,
    init,
    login,
    logout,
  }
}
