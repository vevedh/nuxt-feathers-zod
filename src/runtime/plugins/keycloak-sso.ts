import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import Keycloak from 'keycloak-js'

interface KeycloakProvide {
  user?: any
  permissions?: any[]
  instance: Keycloak
  authenticated: boolean
  userid?: string
  tokenParsed?: Record<string, any>
  token(): string | undefined
  login(opts?: any): Promise<void>
  logout(opts?: any): Promise<void>
  updateToken(minValidity?: number): Promise<boolean>
  whoami(): Promise<{ user?: any, permissions?: any[] } | null>
}

export default defineNuxtPlugin(async (nuxtApp) => {
  if (import.meta.server)
    return

  const rc = useRuntimeConfig()
  const pub = rc.public as any

  const kcPub = pub?._feathers?.keycloak ?? {}
  const serverUrl = kcPub.serverUrl ?? pub.KC_URL
  const realm = kcPub.realm ?? pub.KC_REALM
  const clientId = kcPub.clientId ?? pub.KC_CLIENT_ID

  if (!serverUrl || !realm || !clientId) {
    console.warn('[nuxt-feathers-zod][keycloak-sso] Missing Keycloak config. Expected feathers.keycloak.{serverUrl,realm,clientId} to be exposed in runtimeConfig.public._feathers.keycloak (or legacy KC_URL/KC_REALM/KC_CLIENT_ID).')
    nuxtApp.provide('keycloak', {
      instance: null as any,
      authenticated: false,
      token: () => undefined,
      login: async () => {},
      logout: async () => {},
      updateToken: async () => false,
      whoami: async () => null,
      user: undefined,
      permissions: [],
    } as any)
    return
  }

  const keycloak = new Keycloak({
    url: String(serverUrl),
    realm: String(realm),
    clientId: String(clientId),
  })

  const onLoad = (pub?._feathers?.keycloak?.onLoad === 'login-required')
    ? 'login-required'
    : 'check-sso'

  const initResult = await keycloak.init({
    onLoad,
    checkLoginIframe: false,
    silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
  }).catch(() => ({ authenticated: false } as const))

  const authenticated = (keycloak.authenticated === true) && (initResult as any)?.authenticated !== false
  const userid = keycloak?.tokenParsed?.preferred_username

  const authServicePath = (pub?._feathers?.keycloak?.authServicePath || '/_keycloak') as string

  // --- whoami refresh helpers (Keycloak SSO-only)
  // In SSO-only mode, the token can be refreshed (updateToken) without a full app reload.
  // We refresh whoami() after token refresh to keep auth.user / permissions in sync.
  let refreshTimer: number | undefined
  let lastWhoamiAt = 0

  async function safeWhoami(reason: string) {
    // Throttle to avoid spamming the server.
    const now = Date.now()
    if (now - lastWhoamiAt < 10_000)
      return
    lastWhoamiAt = now

    try {
      await whoami()
      // console.debug('[nuxt-feathers-zod][keycloak-sso] whoami refreshed:', reason)
    }
    catch (e) {
      console.warn('[nuxt-feathers-zod][keycloak-sso] whoami refresh failed:', reason, e)
    }
  }

  function startTokenRefreshLoop() {
    if (refreshTimer)
      window.clearInterval(refreshTimer)

    const minValidity = 60 // seconds
    const intervalMs = 30_000

    refreshTimer = window.setInterval(async () => {
      try {
        const refreshed = await keycloak.updateToken(minValidity)
        if (refreshed)
          await safeWhoami('updateToken(refreshed)')
      }
      catch (e) {
        // If refresh fails (session expired), we keep the app running and let callers decide.
        console.warn('[nuxt-feathers-zod][keycloak-sso] updateToken failed:', e)
      }
    }, intervalMs)

    nuxtApp.hook('app:beforeUnmount', () => {
      if (refreshTimer)
        window.clearInterval(refreshTimer)
    })
  }

  // will be filled below; used so whoami can update exposed state
  const provided: KeycloakProvide = {
    instance: keycloak,
    authenticated,
    userid,
    tokenParsed: keycloak.tokenParsed as any,
    token: () => keycloak.token,
    login: async (opts?: any) => { await keycloak.login(opts) },
    logout: async (opts?: any) => { await keycloak.logout(opts) },
    updateToken: async (minValidity = 30) => {
      const refreshed = await keycloak.updateToken(minValidity)
      if (refreshed)
        await safeWhoami('provided.updateToken(refreshed)')
      return refreshed
    },
    // Fallback user (will be replaced by whoami() when $api is ready)
    user: keycloak.tokenParsed ? { ...keycloak.tokenParsed, userid } : (userid ? { userid } : undefined),
    permissions: [],
    whoami: async () => null,
  }

  async function whoami() {
    if (!provided.authenticated)
      return null
    if (!('$api' in nuxtApp) || !nuxtApp.$api)
      return null

    const token = keycloak.token
    if (!token)
      return null

    try {
      const res = await nuxtApp.$api.service(authServicePath).create({ access_token: token })
      provided.user = res?.user
      provided.permissions = res?.permissions || []
      return res
    }
    catch (e) {
      return null
    }
  }

  // Inject bearer on every feathers client call (always register; inject only when token exists)
  if (('$api' in nuxtApp) && nuxtApp.$api) {
    nuxtApp.$api.hooks({
      before: [
        async (ctx: any) => {
          // refresh softly (no throw)
          await keycloak.updateToken(30).catch(() => {})
          const t = keycloak.token
          if (!t)
            return ctx

          ctx.params ||= {}
          ctx.params.headers ||= {}
          ctx.params.headers.Authorization = `Bearer ${t}`
          return ctx
        },
      ],
    })
  }

  provided.whoami = whoami

  nuxtApp.provide('keycloak', provided)

  // Optionnel: matérialiser user dès le boot (si authenticated)
  if (provided.authenticated) {
    // 1) Try to materialize immediately
    await safeWhoami('post-init')
    // 2) Keep user/permissions fresh on token rotation
    keycloak.onTokenExpired = async () => {
      try {
        const refreshed = await keycloak.updateToken(60)
        if (refreshed)
          await safeWhoami('onTokenExpired(refreshed)')
      }
      catch (e) {
        console.warn('[nuxt-feathers-zod][keycloak-sso] token expired and refresh failed:', e)
      }
    }

    startTokenRefreshLoop()
  }
})
