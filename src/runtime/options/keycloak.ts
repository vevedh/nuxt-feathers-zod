export interface KeycloakOptions {
  /**
   * Keycloak base URL, e.g. https://sso.example.com
   */
  serverUrl: string

  realm: string
  clientId: string

  /**
   * Keycloak init onLoad mode (client-side).
   * - 'check-sso': do not force redirect, just check existing SSO session (recommended for Option A)
   * - 'login-required': force login redirect if not authenticated
   */
  onLoad?: 'check-sso' | 'login-required'

  /**
   * Optional: client secret (only needed for UMA permissions flow)
   */
  secret?: string

  /**
   * Optional: override issuer/audience checks.
   * If omitted, issuer defaults to `${serverUrl}/realms/${realm}`
   * and audience defaults to clientId.
   */
  issuer?: string
  audience?: string | string[]

  /**
   * Map Keycloak subject (`sub`) to a Feathers users service field.
   */
  userService?: string // default: 'users'
  serviceIdField?: string // default: 'keycloakId'

  /**
   * Path for the bridge service (avoid '/auth' collisions).
   */
  authServicePath?: string // default: '/_keycloak'

  /**
   * Enable UMA permissions (requires secret).
   */
  permissions?: boolean // default false
}

export type ResolvedKeycloakOptions = Required<Pick<KeycloakOptions, 'serverUrl' | 'realm' | 'clientId' | 'userService' | 'serviceIdField' | 'authServicePath' | 'permissions' | 'onLoad'>>
  & Omit<KeycloakOptions, 'userService' | 'serviceIdField' | 'authServicePath' | 'permissions' | 'onLoad'>

export type ResolvedKeycloakOptionsOrDisabled = ResolvedKeycloakOptions | false

export function resolveKeycloakOptions(keycloak: KeycloakOptions | boolean | undefined): ResolvedKeycloakOptionsOrDisabled {
  if (!keycloak)
    return false
  if (keycloak === true)
    throw new Error('[nuxt-feathers-zod] feathers.keycloak=true is not supported; please provide an object config.')

  return {
    serverUrl: keycloak.serverUrl,
    realm: keycloak.realm,
    clientId: keycloak.clientId,
    issuer: keycloak.issuer,
    audience: keycloak.audience,
    secret: keycloak.secret,
    userService: keycloak.userService || 'users',
    serviceIdField: keycloak.serviceIdField || 'keycloakId',
    authServicePath: keycloak.authServicePath || '/_keycloak',
    permissions: !!keycloak.permissions,
    onLoad: keycloak.onLoad || 'check-sso',
  }
}
