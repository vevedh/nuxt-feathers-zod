export interface PublicFeathersRuntimeLike {
  _feathers?: {
    client?: {
      mode?: 'embedded' | 'remote'
      remote?: {
        url?: string
        transport?: 'auto' | 'rest' | 'socketio'
        restPath?: string
        websocketPath?: string
        auth?: {
          enabled?: boolean
          servicePath?: string
          payloadMode?: 'jwt' | 'keycloak'
          strategy?: string
          tokenField?: string
          reauth?: boolean
          storageKey?: string
        }
        services?: Array<{ path: string, methods?: string[] }>
      }
    }
    auth?: any
    keycloak?: any
    database?: {
      mongo?: {
        enabled?: boolean
        management?: {
          enabled?: boolean
          basePath?: string
          auth?: {
            enabled?: boolean
            authenticate?: boolean
          }
          routes?: Array<{ key: string, path: string }>
        }
      }
    }
    builder?: {
      enabled?: boolean
      basePath?: string
      auth?: {
        enabled?: boolean
        authenticate?: boolean
      }
      routes?: Array<{
        key: string
        path: string
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      }>
    }
    admin?: {
      diagnostics?: {
        enabled?: boolean
        path?: string
        jsonPath?: string
        format?: 'nfz-devtools-payload'
      }
      devtools?: {
        enabled?: boolean
        path?: string
        jsonPath?: string
        cssPath?: string
        iconPath?: string
      }
    }
    authProvider?: string
  }
  FEATHERS_AUTH_PROVIDER?: string
  NFZ_AUTH_PROVIDER?: string
}

export function getPublicFeathersRuntimeConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return (publicConfig as any)?._feathers ?? {}
}

export function getPublicClientConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicFeathersRuntimeConfig(publicConfig)?.client ?? {}
}

export function getPublicClientMode(publicConfig?: PublicFeathersRuntimeLike | null): 'embedded' | 'remote' {
  return getPublicClientConfig(publicConfig)?.mode === 'remote' ? 'remote' : 'embedded'
}

export function getPublicRemoteConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicClientConfig(publicConfig)?.remote ?? {}
}

export function getPublicRemoteAuthConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicRemoteConfig(publicConfig)?.auth ?? {}
}

export function isPublicRemoteMode(publicConfig?: PublicFeathersRuntimeLike | null): boolean {
  return getPublicClientMode(publicConfig) === 'remote'
}

export function isPublicRemoteAuthEnabled(publicConfig?: PublicFeathersRuntimeLike | null): boolean {
  return isPublicRemoteMode(publicConfig) && Boolean(getPublicRemoteAuthConfig(publicConfig)?.enabled)
}

export function hasPublicKeycloakConfig(publicConfig?: PublicFeathersRuntimeLike | null): boolean {
  return Boolean(getPublicFeathersRuntimeConfig(publicConfig)?.keycloak)
}

export function getForcedAuthProvider(publicConfig?: PublicFeathersRuntimeLike | null): string {
  const pub = publicConfig as any
  const forced = String(pub?.FEATHERS_AUTH_PROVIDER || pub?.NFZ_AUTH_PROVIDER || getPublicFeathersRuntimeConfig(publicConfig)?.authProvider || '').trim().toLowerCase()
  return forced
}


export function getPublicDatabaseConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicFeathersRuntimeConfig(publicConfig)?.database ?? {}
}

export function getPublicMongoManagementConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicDatabaseConfig(publicConfig)?.mongo?.management ?? {}
}

function normalizeLeadingPath(raw: string, fallback = '/') {
  const value = String(raw || '').trim()
  if (!value)
    return fallback
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, '') : withLeadingSlash
}

function joinRuntimePaths(prefix: string, child: string) {
  const left = normalizeLeadingPath(prefix, '/')
  const right = normalizeLeadingPath(child, '/')
  if (left === '/')
    return right
  if (right === '/')
    return left
  return `${left}${right}`
}

export function getPublicMongoManagementBasePath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  const managementPath = normalizeLeadingPath(String(getPublicMongoManagementConfig(publicConfig)?.basePath || '/mongo').trim(), '/mongo')

  if (getPublicClientMode(publicConfig) !== 'embedded')
    return managementPath

  const restPath = normalizeLeadingPath(String(getPublicFeathersRuntimeConfig(publicConfig)?.transports?.rest?.path || '/').trim(), '/')
  return joinRuntimePaths(restPath, managementPath)
}

export function getPublicBuilderConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicFeathersRuntimeConfig(publicConfig)?.builder ?? {}
}

export function getPublicBuilderBasePath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return normalizeLeadingPath(String(getPublicBuilderConfig(publicConfig)?.basePath || '/api/nfz').trim(), '/api/nfz')
}

export function getPublicBuilderRoutes(publicConfig?: PublicFeathersRuntimeLike | null) {
  return Array.isArray(getPublicBuilderConfig(publicConfig)?.routes) ? getPublicBuilderConfig(publicConfig).routes : []
}

export function getPublicBuilderRoute(publicConfig: PublicFeathersRuntimeLike | null | undefined, key: string) {
  return getPublicBuilderRoutes(publicConfig).find((route: any) => String(route?.key || '').trim() === String(key || '').trim())
}

export function getPublicBuilderRoutePath(publicConfig: PublicFeathersRuntimeLike | null | undefined, key: string, fallback = ''): string {
  const route = getPublicBuilderRoute(publicConfig, key)
  const value = String(route?.path || fallback || '').trim()
  return value ? normalizeLeadingPath(value, fallback || '/api/nfz') : normalizeLeadingPath(fallback || '/api/nfz', '/api/nfz')
}

export function getPublicBuilderManifestPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return getPublicBuilderRoutePath(publicConfig, 'manifest', '/api/nfz/manifest')
}

export function getPublicBuilderSchemaPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return getPublicBuilderRoutePath(publicConfig, 'schemaGet', '/api/nfz/schema')
}

export function getPublicBuilderPreviewPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return getPublicBuilderRoutePath(publicConfig, 'preview', '/api/nfz/preview')
}

export function getPublicBuilderApplyPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return getPublicBuilderRoutePath(publicConfig, 'apply', '/api/nfz/apply')
}

export function getPublicBuilderServicesPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return getPublicBuilderRoutePath(publicConfig, 'services', '/api/nfz/services')
}

export function getPublicAdminConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicFeathersRuntimeConfig(publicConfig)?.admin ?? {}
}

export function getPublicDiagnosticsConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicAdminConfig(publicConfig)?.diagnostics ?? {}
}

export function getPublicDevtoolsConfig(publicConfig?: PublicFeathersRuntimeLike | null) {
  return getPublicAdminConfig(publicConfig)?.devtools ?? {}
}

export function getPublicDiagnosticsPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return normalizeLeadingPath(String(
    getPublicDiagnosticsConfig(publicConfig)?.jsonPath
    || getPublicDiagnosticsConfig(publicConfig)?.path
    || getPublicDevtoolsConfig(publicConfig)?.jsonPath
    || '/__nfz-devtools.json',
  ).trim(), '/__nfz-devtools.json')
}

export function getPublicDevtoolsPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return normalizeLeadingPath(String(getPublicDevtoolsConfig(publicConfig)?.path || '/__nfz-devtools').trim(), '/__nfz-devtools')
}

export function getPublicDevtoolsJsonPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return normalizeLeadingPath(String(getPublicDevtoolsConfig(publicConfig)?.jsonPath || '/__nfz-devtools.json').trim(), '/__nfz-devtools.json')
}

export function getPublicDevtoolsCssPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return normalizeLeadingPath(String(getPublicDevtoolsConfig(publicConfig)?.cssPath || '/__nfz-devtools.css').trim(), '/__nfz-devtools.css')
}

export function getPublicDevtoolsIconPath(publicConfig?: PublicFeathersRuntimeLike | null): string {
  return normalizeLeadingPath(String(getPublicDevtoolsConfig(publicConfig)?.iconPath || '/__nfz-devtools-icon.png').trim(), '/__nfz-devtools-icon.png')
}
