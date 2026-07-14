import { computed } from 'vue'
import { useNuxtApp } from '#imports'
import { useAuthRuntime } from './useAuthRuntime'

export function useKeycloakBridge() {
  const nuxtApp = useNuxtApp() as any
  const auth = useAuthRuntime()

  const keycloak = computed(() => nuxtApp.$keycloak || null)
  const authenticated = computed(() => keycloak.value?.authenticated === true)
  const token = computed(() => {
    const value = keycloak.value?.token
    return typeof value === 'function' ? value() : value || null
  })
  const tokenParsed = computed(() => keycloak.value?.tokenParsed || null)
  const user = computed(() => keycloak.value?.user || keycloak.value?.tokenParsed || null)

  async function ensureSynchronized(reason = 'keycloak-client.ensure') {
    if (!authenticated.value)
      return false

    return auth.synchronizeKeycloakSession(reason, {
      token: token.value,
      user: user.value,
      tokenParsed: tokenParsed.value,
      permissions: keycloak.value?.permissions ?? [],
      loginuser: keycloak.value?.userid ?? tokenParsed.value?.preferred_username ?? null,
    })
  }

  async function refreshAndSynchronize(minValidity = 30, reason = 'keycloak-client.refresh') {
    if (!authenticated.value)
      return false
    try {
      await keycloak.value?.updateToken?.(minValidity)
    }
    catch {}
    return ensureSynchronized(reason)
  }

  async function bridgeToFeathers(options: {
    servicePath?: string
    strategy?: string
    tokenField?: string
    payload?: Record<string, any>
  } = {}) {
    await refreshAndSynchronize(30, 'keycloak-client.bridge')
    return auth.bridgeSso(options)
  }

  return {
    keycloak,
    authenticated,
    token,
    tokenParsed,
    user,
    ensureSynchronized,
    refreshAndSynchronize,
    bridgeToFeathers,
  }
}
