import { useNuxtApp, useRuntimeConfig } from '#imports'
import { getPublicBuilderConfig, getPublicBuilderServices } from '../utils/config'

export function useBuilderClient() {
  const publicConfig = useRuntimeConfig().public as any
  const builder = getPublicBuilderConfig(publicConfig)
  const paths = getPublicBuilderServices(publicConfig)
  const api = (useNuxtApp() as any).$api

  function service(path: string) {
    if (!api || typeof api.service !== 'function')
      throw new Error('[nuxt-feathers-zod] The Feathers client is not available.')
    return api.service(path)
  }

  return {
    builder,
    transport: 'feathers' as const,
    services: paths,
    routes: Array.isArray(builder?.routes) ? builder.routes : [],
    getServices: <T = any>(query: Record<string, any> = {}) => service(paths.discovery).find({ query }) as Promise<T>,
    getManifest: <T = any>() => service(paths.manifest).get('current') as Promise<T>,
    saveManifest: <T = any>(payload: any) => service(paths.manifest).patch('current', payload) as Promise<T>,
    getSchema: <T = any>(serviceName: string) => service(paths.schemas).get(serviceName) as Promise<T>,
    saveSchema: <T = any>(serviceName: string, payload: any) => service(paths.schemas).patch(serviceName, payload) as Promise<T>,
    preview: <T = any>(payload: any) => service(paths.builder).create({ action: 'preview', ...payload }) as Promise<T>,
    apply: <T = any>(payload: any) => service(paths.builder).create({ action: 'apply', ...payload }) as Promise<T>,
    getStatus: <T = any>() => service(paths.status).find() as Promise<T>,
    getRbac: <T = any>() => service(paths.rbac).get('current') as Promise<T>,
    saveRbac: <T = any>(payload: any) => service(paths.rbac).patch('current', payload) as Promise<T>,
    getPresets: <T = any>() => service(paths.presets).find() as Promise<T>,
    previewPreset: <T = any>(preset: string, params: Record<string, any> = {}) => service(paths.presets).create({ action: 'preview', preset, params }) as Promise<T>,
    applyPreset: <T = any>(preset: string, params: Record<string, any> = {}) => service(paths.presets).create({ action: 'apply', preset, params }) as Promise<T>,
    initializeUsers: <T = any>(adapter: 'mongodb' | 'memory' = 'mongodb') => service(paths.init).create({ action: 'add-users', adapter }) as Promise<T>,
  }
}
