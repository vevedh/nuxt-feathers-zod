import { useRequestFetch } from '#imports'
import { useAuthRuntime } from './useAuthRuntime'

export interface AuthBoundOptions extends RequestInit {
  auth?: 'required' | 'optional' | 'none'
  retryOn401?: boolean
}

function mergeHeaders(input: HeadersInit | undefined, authorization: string | null) {
  const headers = new Headers(input || {})
  if (authorization && !headers.has('authorization') && !headers.has('Authorization')) {
    headers.set('Authorization', authorization)
  }
  return headers
}

function toRequestInit(input: RequestInfo | URL, init: AuthBoundOptions, headers: Headers) {
  const request = input instanceof Request ? input : null
  const base: RequestInit = request
    ? {
        method: request.method,
        body: request.body,
        credentials: request.credentials,
        cache: request.cache,
        integrity: request.integrity,
        keepalive: request.keepalive,
        mode: request.mode,
        redirect: request.redirect,
        referrer: request.referrer,
        referrerPolicy: request.referrerPolicy,
        signal: request.signal,
      }
    : {}

  const result: RequestInit = {
    ...base,
    ...init,
    headers,
  }

  delete (result as any).auth
  delete (result as any).retryOn401
  return result
}

function resolveNativeFetch() {
  if (import.meta.server)
    return useRequestFetch()
  if (typeof window !== 'undefined' && typeof window.fetch === 'function')
    return window.fetch.bind(window)
  if (typeof globalThis.fetch === 'function')
    return globalThis.fetch.bind(globalThis)
  throw new Error('[nuxt-feathers-zod] No native fetch implementation available')
}

export function useAuthBoundFetchImplementation(defaults: Partial<AuthBoundOptions> = {}) {
  const auth = useAuthRuntime()
  const nativeFetch = resolveNativeFetch()

  return async function authBoundFetch(input: RequestInfo | URL, init: AuthBoundOptions = {}) {
    const authMode = init.auth ?? defaults.auth ?? 'required'
    const retryOn401 = init.retryOn401 ?? defaults.retryOn401 ?? true

    if (authMode !== 'none') {
      await auth.ensureReady('auth-bound-fetch')
      if (auth.provider.value === 'keycloak')
        await auth.ensureValidatedBearer('auth-bound-fetch')
    }

    async function execute() {
      const authorization = authMode === 'none' ? null : await auth.getAuthorizationHeader()
      const headers = mergeHeaders(init.headers, authorization)
      return await nativeFetch(input, toRequestInit(input, init, headers))
    }

    let response = await execute()

    if (authMode !== 'none' && retryOn401 && response.status === 401) {
      await auth.reAuthenticate().catch(() => null)
      response = await execute()
    }

    return response
  }
}

export function useAuthBoundFetch(defaults: Partial<AuthBoundOptions> = {}) {
  const request = useAuthBoundFetchImplementation(defaults)

  return async function authBoundRequest<T = any>(input: RequestInfo | URL, init: AuthBoundOptions = {}): Promise<T> {
    const response = await request(input, init)
    if (response.status === 204)
      return null as T

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      throw {
        name: 'AuthBoundFetchError',
        message: (payload as any)?.message || response.statusText || 'Request failed',
        status: response.status,
        statusCode: response.status,
        data: payload,
      }
    }

    return payload as T
  }
}
