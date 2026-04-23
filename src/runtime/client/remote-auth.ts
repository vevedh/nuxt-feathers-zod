import { useCookie, useRuntimeConfig } from '#imports'

import { useAuthRuntime } from '../composables/useAuthRuntime'
import { buildRemoteAuthPayload, getAccessTokenFromResult } from '../utils/auth'
import { getPublicClientMode, getPublicRemoteAuthConfig } from '../utils/config'

export async function resolveRemoteToken(nuxtApp: any): Promise<string | null> {
  const runtime = useRuntimeConfig()
  const remoteAuth = getPublicRemoteAuthConfig(runtime.public as any)

  if (import.meta.server)
    return null

  const keycloak = nuxtApp?.$keycloak
  if (remoteAuth?.payloadMode === 'keycloak' && keycloak?.authenticated) {
    try {
      await keycloak.updateToken?.(30)
    }
    catch {}

    const token = typeof keycloak?.token === 'function' ? keycloak.token() : keycloak?.token
    if (typeof token === 'string' && token)
      return token
  }

  const storageKey = remoteAuth?.storageKey || runtime.public?._feathers?.auth?.client?.storageKey || 'feathers-jwt'
  const jwt = useCookie<string | null>(storageKey)
  return jwt.value || null
}

export async function syncUnifiedAuthState(
  result: any,
  fallbackToken: string | null,
  authenticated: boolean,
  source: 'authenticate' | 'reauth' | 'runtime',
  error?: unknown,
): Promise<void> {
  const authRuntime = useAuthRuntime()
  const resolvedToken = getAccessTokenFromResult(result) || fallbackToken || null

  await authRuntime.setSession({
    accessToken: authenticated ? resolvedToken : null,
    user: authenticated ? (result?.user ?? authRuntime.user.value ?? null) : null,
    authenticated,
    permissions: authenticated ? (result?.permissions ?? authRuntime.permissions.value ?? []) : [],
    error: error ?? null,
  }, source)
}

export async function remoteAuthenticate(feathersClient: any, nuxtApp: any): Promise<void> {
  const runtime = useRuntimeConfig()
  const mode = getPublicClientMode(runtime.public as any)
  const remoteAuth = getPublicRemoteAuthConfig(runtime.public as any)

  if (import.meta.server || mode !== 'remote' || !remoteAuth?.enabled)
    return

  const token = await resolveRemoteToken(nuxtApp)
  const authClientToken = await feathersClient.authentication?.getAccessToken?.().catch?.(() => null) || null

  try {
    if (token) {
      const payload = buildRemoteAuthPayload(token, remoteAuth)
      const result = await feathersClient.authenticate?.(payload)
      await syncUnifiedAuthState(result, token, true, 'authenticate')
      return
    }

    if (remoteAuth?.reauth !== false && authClientToken) {
      const result = await feathersClient.reAuthenticate?.()
      await syncUnifiedAuthState(result, null, true, 'reauth')
      return
    }

    await syncUnifiedAuthState(null, null, false, 'runtime')
  }
  catch (error) {
    await syncUnifiedAuthState(null, null, false, 'runtime', error)
  }
}
