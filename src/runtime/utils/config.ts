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
