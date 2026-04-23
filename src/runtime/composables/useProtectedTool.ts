import { useAuthBoundFetch } from './useAuthBoundFetch'

export interface ProtectedToolRequestOptions {
  auth?: 'required' | 'optional' | 'none'
  retryOn401?: boolean
  query?: Record<string, any>
  body?: any
  headers?: HeadersInit
  method?: string
  [key: string]: any
}

function trimSlashes(value: string) {
  return String(value || '').replace(/^\/+/, '').replace(/\/+$/, '')
}

function joinToolPath(basePath: string, path = '') {
  const base = trimSlashes(basePath)
  const child = trimSlashes(path)
  if (!base && !child)
    return '/'
  if (!base)
    return `/${child}`
  if (!child)
    return `/${base}`
  return `/${base}/${child}`
}

function withQuery(path: string, query?: Record<string, any>) {
  if (!query || typeof query !== 'object')
    return path

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value == null)
      continue
    if (Array.isArray(value)) {
      for (const item of value)
        params.append(key, String(item))
      continue
    }
    params.set(key, String(value))
  }

  const serialized = params.toString()
  return serialized ? `${path}?${serialized}` : path
}

export function useProtectedTool(basePath: string, defaults: Partial<ProtectedToolRequestOptions> = {}) {
  const authFetch = useAuthBoundFetch({ auth: defaults.auth ?? 'required', retryOn401: defaults.retryOn401 ?? true })

  async function request<T = any>(path = '', options: ProtectedToolRequestOptions = {}) {
    const method = String(options.method || (options.body != null ? 'POST' : 'GET')).toUpperCase()
    const url = withQuery(joinToolPath(basePath, path), options.query)
    const hasBody = options.body != null && method !== 'GET' && method !== 'HEAD'
    const headers = new Headers(defaults.headers || {})
    new Headers(options.headers || {}).forEach((value, key) => {
      headers.set(key, value)
    })
    if (hasBody && !headers.has('content-type'))
      headers.set('content-type', 'application/json')

    return await authFetch<T>(url, {
      ...defaults,
      ...options,
      method,
      body: hasBody
        ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
        : undefined,
      headers,
    })
  }

  return {
    basePath: joinToolPath(basePath),
    request,
    get: <T = any>(path = '', options: ProtectedToolRequestOptions = {}) => request<T>(path, { ...options, method: 'GET' }),
    post: <T = any>(path = '', body?: any, options: ProtectedToolRequestOptions = {}) => request<T>(path, { ...options, method: 'POST', body }),
    put: <T = any>(path = '', body?: any, options: ProtectedToolRequestOptions = {}) => request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T = any>(path = '', body?: any, options: ProtectedToolRequestOptions = {}) => request<T>(path, { ...options, method: 'PATCH', body }),
    remove: <T = any>(path = '', options: ProtectedToolRequestOptions = {}) => request<T>(path, { ...options, method: 'DELETE' }),
    head: <T = any>(path = '', options: ProtectedToolRequestOptions = {}) => request<T>(path, { ...options, method: 'HEAD' }),
  }
}
