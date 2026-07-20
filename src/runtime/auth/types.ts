import type { AuthenticationStrategy } from '@feathersjs/authentication'
import type { NfzAuthenticationAssuranceLevel, NfzPrincipalClaimsOptions } from './principal'

export type NfzBuiltInAuthenticationProviderType = 'jwt' | 'local' | 'oauth' | 'oidc' | 'api-key' | 'custom'
export type NfzAuthenticationProviderType = NfzBuiltInAuthenticationProviderType | (string & {})

export interface NfzAuthenticationProviderBaseOptions {
  type?: NfzAuthenticationProviderType
  enabled?: boolean
  parse?: boolean
  issueAccessToken?: boolean
  assuranceLevel?: NfzAuthenticationAssuranceLevel
}

export interface NfzJwtProviderOptions extends NfzAuthenticationProviderBaseOptions {
  type?: 'jwt'
  header?: string
  schemes?: string[]
}

export interface NfzLocalProviderOptions extends NfzAuthenticationProviderBaseOptions {
  type?: 'local'
  hashSize?: number
  usernameField?: string
  passwordField?: string
  entityUsernameField?: string
  entityPasswordField?: string
  errorMessage?: string
}

export interface NfzOAuthProviderOptions extends NfzAuthenticationProviderBaseOptions {
  type?: 'oauth'
}

export interface NfzOidcProviderOptions extends NfzAuthenticationProviderBaseOptions {
  type: 'oidc'
  issuer: string
  audience: string | string[]
  jwksUri?: string
  algorithms?: string[]
  header?: string
  schemes?: string[]
  userService?: string
  subjectField?: string
  userProvisioning?: 'disabled' | 'create-if-missing'
  /** @deprecated Use allowClaimsOnlyIdentity. It never bypasses token verification. */
  failOpen?: boolean
  allowClaimsOnlyIdentity?: boolean
  allowInsecureHttp?: boolean
  discoveryTimeoutMs?: number
  claims?: NfzPrincipalClaimsOptions
}

export interface NfzApiKeyIdentity {
  subject: string
  tenantId?: string
  organizationId?: string
  username?: string
  roles?: string[]
  permissions?: string[]
  scopes?: string[]
  assuranceLevel?: NfzAuthenticationAssuranceLevel
  entity?: Record<string, unknown>
}

export interface NfzApiKeyRecord extends NfzApiKeyIdentity {
  id: string
  hash: string
  expiresAt?: string
  revoked?: boolean
}

export interface NfzApiKeyProviderOptions extends NfzAuthenticationProviderBaseOptions {
  type: 'api-key'
  header?: string
  schemes?: string[]
  pepper?: string
  keys: NfzApiKeyRecord[]
}

export interface NfzCustomProviderOptions extends NfzAuthenticationProviderBaseOptions {
  type: 'custom' | (string & {})
}

export type NfzAuthenticationProviderOptions =
  | NfzJwtProviderOptions
  | NfzLocalProviderOptions
  | NfzOAuthProviderOptions
  | NfzOidcProviderOptions
  | NfzApiKeyProviderOptions
  | NfzCustomProviderOptions

export type NfzAuthenticationProviders = Record<string, NfzAuthenticationProviderOptions>

export interface NfzAuthenticationProviderRegistration {
  name: string
  type: NfzAuthenticationProviderType
  strategy: AuthenticationStrategy
  issueAccessToken: boolean
  parse: boolean
}

export interface NfzAuthenticationProviderFactoryContext {
  app: any
  name: string
  options: NfzAuthenticationProviderOptions
}

export type NfzAuthenticationProviderFactory = (
  context: NfzAuthenticationProviderFactoryContext,
) => AuthenticationStrategy
