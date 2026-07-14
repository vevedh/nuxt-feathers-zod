import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import Keycloak from 'keycloak-js'
import { useAuthRuntime } from '../composables/useAuthRuntime'

function cleanupOidcCallbackHash() {
  if (typeof window === 'undefined')
    return

  const hash = window.location.hash || ''
  if (!hash || !/(state=|session_state=|code=)/.test(hash))
    return

  const cleanUrl = `${window.location.pathname}${window.location.search}`
  window.history.replaceState(window.history.state, '', cleanUrl)
}

interface KeycloakProvide {
  user?: any
  permissions?: any[]
  instance: Keycloak | null
  authenticated: boolean
  userid?: string
  tokenParsed?: Record<string, any>
  token(): string | undefined
  login(opts?: any): Promise<void>
  logout(opts?: any): Promise<void>
  updateToken(minValidity?: number): Promise<boolean>
  whoami(): Promise<{ user?: any, permissions?: any[] } | null>
  ensureFeathersAuth(reason?: string): Promise<boolean>
}

export default defineNuxtPlugin(async (nuxtApp: any) => {
  if (import.meta.server)
    return

  const rc = useRuntimeConfig()
  const pub = rc.public as any
  const kcPub = pub?._feathers?.keycloak ?? {}
  const serverUrl = kcPub.serverUrl ?? pub.KC_URL
  const realm = kcPub.realm ?? pub.KC_REALM
  const clientId = kcPub.clientId ?? pub.KC_CLIENT_ID
  const authRuntime = useAuthRuntime()

  if (!serverUrl || !realm || !clientId) {
    nuxtApp.provide('keycloak', {
      instance: null,
      authenticated: false,
      token: () => undefined,
      login: async () => {},
      logout: async () => {},
      updateToken: async () => false,
      whoami: async () => null,
      ensureFeathersAuth: async () => false,
      user: undefined,
      permissions: [],
    } as KeycloakProvide)
    await authRuntime.setSsoSession({ token: null, user: null, authenticated: false }, 'keycloak-client')
    return
  }

  const keycloak = new Keycloak({
    url: String(serverUrl),
    realm: String(realm),
    clientId: String(clientId),
  })

  const onLoad = kcPub?.onLoad === 'login-required' ? 'login-required' : 'check-sso'
  const initResult = await keycloak.init({
    onLoad,
    pkceMethod: 'S256',
    checkLoginIframe: false,
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
  }).catch(() => ({ authenticated: false } as const))

  cleanupOidcCallbackHash()

  const authenticated = keycloak.authenticated === true && (initResult as { authenticated?: boolean })?.authenticated !== false
  const userid = keycloak?.tokenParsed?.preferred_username

  function buildSsoUser() {
    return keycloak.tokenParsed ? { ...keycloak.tokenParsed, userid } : (userid ? { userid } : null)
  }

  async function syncSsoSession(reason = 'keycloak-client') {
    await authRuntime.synchronizeKeycloakSession(reason, {
      token: keycloak.token,
      user: buildSsoUser(),
      tokenParsed: keycloak.tokenParsed,
      permissions: [],
      loginuser: userid ?? null,
    })
  }

  const provided: KeycloakProvide = {
    instance: keycloak,
    authenticated,
    userid,
    tokenParsed: keycloak.tokenParsed as Record<string, any> | undefined,
    token: () => keycloak.token,
    login: async (opts?: any) => { await keycloak.login(opts) },
    logout: async (opts?: any) => {
      await authRuntime.logout().catch(() => {})
      await keycloak.logout(opts)
    },
    updateToken: async (minValidity = 30) => {
      const refreshed = await keycloak.updateToken(minValidity)
      if (refreshed) {
        provided.tokenParsed = keycloak.tokenParsed as Record<string, any> | undefined
        provided.user = buildSsoUser() ?? undefined
        await syncSsoSession('keycloak.updateToken(refreshed)')
      }
      return refreshed
    },
    user: buildSsoUser() ?? undefined,
    permissions: [],
    whoami: async () => {
      if (!provided.authenticated)
        return null
      provided.user = authRuntime.ssoUser.value ?? provided.user
      provided.permissions = authRuntime.permissions.value ?? []
      return {
        user: provided.user,
        permissions: provided.permissions,
      }
    },
    ensureFeathersAuth: async () => authRuntime.feathersAuthenticated.value,
  }

  nuxtApp.provide('keycloak', provided)

  if (authenticated) {
    await syncSsoSession('keycloak-init').catch(() => false)

    const refreshTimer = window.setInterval(async () => {
      try {
        await provided.updateToken(60)
      }
      catch (error) {
        console.warn('[nuxt-feathers-zod][keycloak-sso] updateToken failed:', error)
      }
    }, 30_000)

    nuxtApp.hook('app:beforeUnmount', () => {
      window.clearInterval(refreshTimer)
    })
  }
  else {
    await authRuntime.setSsoSession({ token: null, user: null, authenticated: false }, 'keycloak-client')
  }
})
