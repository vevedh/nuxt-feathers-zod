import Keycloak from 'keycloak-js'
import { useSsoSessionStore } from '~/stores/sso-session'

interface PublicKeycloakConfig {
  serverUrl?: string
  realm?: string
  clientId?: string
  onLoad?: 'check-sso' | 'login-required'
}

interface ProvidedKeycloakClient {
  instance: Keycloak | null
  authenticated: boolean
  token(): string | undefined
  tokenParsed(): Record<string, unknown> | undefined
  login(options?: Record<string, unknown>): Promise<void>
  logout(options?: Record<string, unknown>): Promise<void>
  updateToken(minValidity?: number): Promise<boolean>
}

function cleanupOidcCallbackUrl(): void {
  const url = new URL(window.location.href)
  const hashValue = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  const hashParams = new URLSearchParams(hashValue)

  const hasKeycloakHash = hashParams.has('state')
    && (hashParams.has('code') || hashParams.has('session_state'))

  const hasKeycloakQuery = url.searchParams.has('state')
    && (url.searchParams.has('code') || url.searchParams.has('session_state'))

  if (hasKeycloakHash) {
    url.hash = ''
  }

  if (hasKeycloakQuery) {
    url.searchParams.delete('state')
    url.searchParams.delete('session_state')
    url.searchParams.delete('code')
  }

  if (hasKeycloakHash || hasKeycloakQuery) {
    window.history.replaceState(
      window.history.state,
      document.title,
      `${url.pathname}${url.search}${url.hash}`,
    )
  }
}

function createEmptyKeycloakClient(): ProvidedKeycloakClient {
  return {
    instance: null,
    authenticated: false,
    token: () => undefined,
    tokenParsed: () => undefined,
    login: async () => {},
    logout: async () => {},
    updateToken: async () => false,
  }
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig()
  const keycloakConfig = config.public.keycloak as PublicKeycloakConfig
  const sso = useSsoSessionStore()

  const serverUrl = keycloakConfig.serverUrl
  const realm = keycloakConfig.realm
  const clientId = keycloakConfig.clientId

  if (!serverUrl || !realm || !clientId) {
    sso.setAnonymous()
    return {
      provide: {
        keycloakClient: createEmptyKeycloakClient(),
      },
    }
  }

  const keycloak = new Keycloak({
    url: serverUrl,
    realm,
    clientId,
  })

  function syncSession(authenticated: boolean): void {
    sso.setSession({
      authenticated,
      token: authenticated ? keycloak.token ?? null : null,
      tokenParsed: authenticated ? keycloak.tokenParsed as Record<string, unknown> : null,
    })
  }

  try {
    const authenticated = await keycloak.init({
      onLoad: keycloakConfig.onLoad || 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      responseMode: 'fragment',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    })

    cleanupOidcCallbackUrl()
    syncSession(authenticated === true && Boolean(keycloak.token))
  }
  catch (error) {
    cleanupOidcCallbackUrl()
    sso.setError(error)
  }

  const provided: ProvidedKeycloakClient = {
    instance: keycloak,
    authenticated: keycloak.authenticated === true,
    token: () => keycloak.token,
    tokenParsed: () => keycloak.tokenParsed,
    login: async options => keycloak.login(options),
    logout: async (options) => {
      sso.clear()
      await keycloak.logout(options)
    },
    updateToken: async (minValidity = 30) => {
      const refreshed = await keycloak.updateToken(minValidity)
      syncSession(keycloak.authenticated === true && Boolean(keycloak.token))
      return refreshed
    },
  }

  if (sso.authenticated) {
    const refreshTimer = window.setInterval(async () => {
      try {
        await provided.updateToken(60)
      }
      catch (error) {
        console.warn('[keycloak client-only] updateToken failed', error)
      }
    }, 30_000)

    nuxtApp.hook('app:beforeUnmount', () => {
      window.clearInterval(refreshTimer)
    })
  }

  return {
    provide: {
      keycloakClient: provided,
    },
  }
})
