import type { KeycloakLdapAuthResult } from '~/types/ldap-user'
import { useLdapSessionStore } from '~/stores/ldap-session'
import { useSsoSessionStore } from '~/stores/sso-session'

interface ApiService<TCreateResult> {
  create(data: Record<string, unknown>, params?: Record<string, unknown>): Promise<TCreateResult>
}

interface FeathersLikeApi {
  service(path: string): ApiService<KeycloakLdapAuthResult>
}

interface NfzAuthRuntime {
  setFeathersSession?: (session: {
    accessToken?: string
    user?: unknown
    authentication?: unknown
  }) => Promise<void> | void
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function resolveFeathersApi(): FeathersLikeApi {
  const nuxtApp = useNuxtApp() as unknown as {
    $api?: FeathersLikeApi
    $feathers?: FeathersLikeApi
    $feathersClient?: FeathersLikeApi
    $nfzApi?: FeathersLikeApi
  }

  const api = nuxtApp.$api
    || nuxtApp.$feathers
    || nuxtApp.$feathersClient
    || nuxtApp.$nfzApi

  if (!api || typeof api.service !== 'function') {
    throw new Error('Client Feathers/NFZ indisponible : impossible d’appeler le service authentication.')
  }

  return api
}

function extractAccessToken(result: KeycloakLdapAuthResult): string | undefined {
  return result.accessToken || result.access_token || result.token
}

function extractUsername(tokenParsed: Record<string, unknown> | null | undefined): string | null {
  const candidates = [
    tokenParsed?.preferred_username,
    tokenParsed?.userid,
    tokenParsed?.username,
    tokenParsed?.email,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  return null
}

async function setOptionalFeathersSession(result: KeycloakLdapAuthResult): Promise<void> {
  const maybeUseAuth = globalThis as unknown as {
    useAuth?: () => NfzAuthRuntime
  }

  const runtimeAuth = typeof maybeUseAuth.useAuth === 'function'
    ? maybeUseAuth.useAuth()
    : null

  if (!runtimeAuth || typeof runtimeAuth.setFeathersSession !== 'function') {
    return
  }

  await runtimeAuth.setFeathersSession({
    accessToken: extractAccessToken(result),
    user: result.user,
    authentication: result.authentication,
  })
}

async function authenticateWithNfzRemote(
  token: string,
  reason: string,
  tokenParsed: Record<string, unknown> | null,
): Promise<KeycloakLdapAuthResult> {
  const api = resolveFeathersApi()
  const username = extractUsername(tokenParsed)

  return await api.service('authentication').create({
    strategy: 'keycloak-ldap',
    username,
    authenticated: true,
    access_token: token,
    tokenParsed,
    ssoUser: tokenParsed,
    reason,
  })
}

export function useKeycloakLdapBridge() {
  const sso = useSsoSessionStore()
  const ldapSession = useLdapSessionStore()

  async function synchronize(reason = 'manual'): Promise<KeycloakLdapAuthResult | null> {
    ldapSession.startLoading()

    try {
      const { ensureFreshToken, tokenParsed } = useKeycloakToken()
      const token = await ensureFreshToken()
      const ssoUser = tokenParsed.value || sso.tokenParsed

      if (!token || !sso.authenticated) {
        ldapSession.setError('Token Keycloak indisponible. Connecte-toi d’abord via Keycloak.')
        return null
      }

      const result = await authenticateWithNfzRemote(token, reason, ssoUser)

      await setOptionalFeathersSession(result)
      ldapSession.setAuthResult(result)

      return result
    } catch (error) {
      ldapSession.setError(error)

      if (import.meta.dev) {
        console.error('[keycloak-ldap] synchronize failed', normalizeError(error), error)
      }

      return null
    }
  }

  return {
    synchronize,
    ldapSession,
  }
}
