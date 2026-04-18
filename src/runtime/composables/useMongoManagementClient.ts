import { useRuntimeConfig } from '#imports'
import { getPublicMongoManagementBasePath, getPublicMongoManagementConfig } from '../utils/config'
import { useProtectedTool } from './useProtectedTool'

function encodePath(value: string) {
  return encodeURIComponent(String(value || ''))
}

export function useMongoManagementClient() {
  const publicConfig = useRuntimeConfig().public as any
  const management = getPublicMongoManagementConfig(publicConfig)
  const basePath = getPublicMongoManagementBasePath(publicConfig)
  const tool = useProtectedTool(basePath)

  return {
    basePath,
    management,
    routes: Array.isArray(management?.routes) ? management.routes : [],
    request: tool.request,
    getDatabases: <T = any>() => tool.get<T>('databases'),
    getCollections: <T = any>(db: string) => tool.get<T>(`${encodePath(db)}/collections`),
    getUsers: <T = any>() => tool.get<T>('users'),
    getStats: <T = any>(db: string) => tool.get<T>(`${encodePath(db)}/stats`),
    getIndexes: <T = any>(db: string, collection: string) => tool.get<T>(`${encodePath(db)}/${encodePath(collection)}/indexes`),
    getCount: <T = any>(db: string, collection: string) => tool.get<T>(`${encodePath(db)}/${encodePath(collection)}/count`),
    getSchema: <T = any>(db: string, collection: string) => tool.get<T>(`${encodePath(db)}/${encodePath(collection)}/schema`),
    getDocuments: <T = any>(db: string, collection: string, query: Record<string, any> = {}) => tool.get<T>(`${encodePath(db)}/${encodePath(collection)}/documents`, { query }),
    aggregate: <T = any>(db: string, collection: string, pipeline: any[], options: Record<string, any> = {}) => tool.post<T>(`${encodePath(db)}/${encodePath(collection)}/aggregate`, { pipeline, ...options }),
  }
}
