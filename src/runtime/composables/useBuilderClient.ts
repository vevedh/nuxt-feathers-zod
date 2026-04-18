import { useRuntimeConfig } from '#imports'
import {
  getPublicBuilderApplyPath,
  getPublicBuilderConfig,
  getPublicBuilderManifestPath,
  getPublicBuilderPreviewPath,
  getPublicBuilderSchemaPath,
  getPublicBuilderServicesPath,
} from '../utils/config'
import { useAuthBoundFetch } from './useAuthBoundFetch'

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

export function useBuilderClient() {
  const publicConfig = useRuntimeConfig().public as any
  const builder = getPublicBuilderConfig(publicConfig)
  const authFetch = useAuthBoundFetch({ auth: 'required', retryOn401: true })

  const servicesPath = getPublicBuilderServicesPath(publicConfig)
  const manifestPath = getPublicBuilderManifestPath(publicConfig)
  const schemaPath = getPublicBuilderSchemaPath(publicConfig)
  const previewPath = getPublicBuilderPreviewPath(publicConfig)
  const applyPath = getPublicBuilderApplyPath(publicConfig)

  async function request<T = any>(path: string, options: { method?: string, body?: any, query?: Record<string, any> } = {}) {
    const method = String(options.method || (options.body != null ? 'POST' : 'GET')).toUpperCase()
    const url = withQuery(path, options.query)
    return await authFetch<T>(url, {
      method,
      body: options.body != null && method !== 'GET' && method !== 'HEAD'
        ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
        : undefined,
      headers: options.body != null && method !== 'GET' && method !== 'HEAD'
        ? { 'content-type': 'application/json' }
        : undefined,
    })
  }

  return {
    builder,
    routes: Array.isArray(builder?.routes) ? builder.routes : [],
    request,
    getServices: <T = any>(query: Record<string, any> = {}) => request<T>(servicesPath, { method: 'GET', query }),
    getManifest: <T = any>() => request<T>(manifestPath, { method: 'GET' }),
    saveManifest: <T = any>(payload: any) => request<T>(manifestPath, { method: 'POST', body: payload }),
    getSchema: <T = any>(service: string) => request<T>(schemaPath, { method: 'GET', query: { service } }),
    saveSchema: <T = any>(service: string, payload: any) => request<T>(schemaPath, { method: 'POST', body: { service, ...payload } }),
    preview: <T = any>(payload: any) => request<T>(previewPath, { method: 'POST', body: payload }),
    apply: <T = any>(payload: any) => request<T>(applyPath, { method: 'POST', body: payload }),
  }
}
