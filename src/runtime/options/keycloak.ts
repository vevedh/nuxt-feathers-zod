export type KeycloakRuntimeMode = 'client-only' | 'bridge'
export type KeycloakUserProvisioning = 'disabled' | 'create-if-missing'

export interface KeycloakOptions {
  /** Keycloak base URL, for example https://sso.example.com */
  serverUrl: string
  realm: string
  clientId: string

  /** Browser initialization mode. */
  onLoad?: 'check-sso' | 'login-required'

  /**
   * `client-only` keeps the existing browser-only integration.
   * `bridge` additionally enables server-side token validation and user lookup.
   */
  mode?: KeycloakRuntimeMode

  /** Private client secret, used only by server-side permission flows. */
  secret?: string

  issuer?: string
  audience?: string | string[]

  userService?: string
  serviceIdField?: string
  authServicePath?: string
  permissions?: boolean

  /** Create a local user only when this option is explicitly enabled. */
  userProvisioning?: KeycloakUserProvisioning

  /**
   * Return verified token claims when the local user service is unavailable.
   * Disabled by default so infrastructure failures remain visible.
   */
  failOpen?: boolean
}

export type ResolvedKeycloakOptions = Required<Pick<
  KeycloakOptions,
  | 'serverUrl'
  | 'realm'
  | 'clientId'
  | 'userService'
  | 'serviceIdField'
  | 'authServicePath'
  | 'permissions'
  | 'onLoad'
  | 'mode'
  | 'userProvisioning'
  | 'failOpen'
>>
& Omit<
  KeycloakOptions,
  | 'userService'
  | 'serviceIdField'
  | 'authServicePath'
  | 'permissions'
  | 'onLoad'
  | 'mode'
  | 'userProvisioning'
  | 'failOpen'
>

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
    permissions: Boolean(keycloak.permissions),
    onLoad: keycloak.onLoad || 'check-sso',
    mode: keycloak.mode || 'client-only',
    userProvisioning: keycloak.userProvisioning || 'disabled',
    failOpen: keycloak.failOpen === true,
  }
}
