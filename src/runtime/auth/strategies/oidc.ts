import type { AuthenticationParams, AuthenticationRequest, AuthenticationResult } from '@feathersjs/authentication'
import type { IncomingMessage } from 'node:http'
import type { NfzOidcProviderOptions } from '../types'
import { AuthenticationBaseStrategy } from '@feathersjs/authentication'
import { NotAuthenticated } from '@feathersjs/errors'
import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose'
import { createNfzPrincipal } from '../principal'

interface OidcDiscoveryDocument {
  issuer?: string
  jwks_uri?: string
}

interface NfzAuthenticationServiceConfiguration {
  entity?: string | null
  service?: string
}

const supportedOidcAlgorithms = new Set([
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
])

function normalizeIssuer(value: string): string {
  return value.replace(/\/+$/, '')
}

function headerValue(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers?.[name.toLowerCase()]
  return typeof value === 'string' ? value : undefined
}

function parseToken(value: string, schemes: string[]): string | null {
  const parts = value.trim().split(/\s/u).filter(Boolean)
  if (parts.length <= 1)
    return parts[0] || null

  const [scheme, ...tokenParts] = parts
  const accepted = schemes.some(item => item.toLowerCase() === scheme.toLowerCase())
  return accepted ? tokenParts.join(' ') : null
}

function audienceMatches(actual: unknown, expected: string | string[]): boolean {
  const actualValues = Array.isArray(actual)
    ? actual.filter((value): value is string => typeof value === 'string')
    : typeof actual === 'string'
      ? [actual]
      : []
  const expectedValues = Array.isArray(expected) ? expected : [expected]
  return expectedValues.some(value => actualValues.includes(value))
}

function assertSecureRemoteUrl(value: string, label: string, allowInsecureHttp = false): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new Error(`[nuxt-feathers-zod] ${label} must use HTTP or HTTPS.`)
  if (url.username || url.password)
    throw new Error(`[nuxt-feathers-zod] ${label} must not embed credentials.`)

  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1'
  const production = process.env.NODE_ENV === 'production'
  if (url.protocol !== 'https:' && (production || (!local && !allowInsecureHttp))) {
    throw new Error(`[nuxt-feathers-zod] ${label} must use HTTPS outside isolated local development.`)
  }
  return url
}

function assertSecureIssuer(config: NfzOidcProviderOptions): void {
  const issuer = assertSecureRemoteUrl(config.issuer, `OIDC issuer '${config.issuer}'`, config.allowInsecureHttp === true)
  if (issuer.search || issuer.hash)
    throw new Error(`[nuxt-feathers-zod] OIDC issuer '${config.issuer}' must not contain a query string or fragment.`)
  if (config.failOpen === true && process.env.NODE_ENV === 'production')
    throw new Error('[nuxt-feathers-zod] OIDC failOpen is forbidden in production.')

  const algorithms = config.algorithms || ['RS256']
  if (algorithms.length === 0)
    throw new Error('[nuxt-feathers-zod] OIDC strategy must allow at least one asymmetric signing algorithm.')
  const unsupported = algorithms.find(algorithm => !supportedOidcAlgorithms.has(algorithm))
  if (unsupported)
    throw new Error(`[nuxt-feathers-zod] OIDC algorithm '${unsupported}' is not allowed for remote JWKS verification.`)
}

export class NfzOidcStrategy extends AuthenticationBaseStrategy {
  private jwksPromise?: Promise<ReturnType<typeof createRemoteJWKSet>>

  get configuration(): NfzOidcProviderOptions {
    return super.configuration as NfzOidcProviderOptions
  }

  verifyConfiguration(): void {
    const config = this.configuration
    if (!config?.issuer)
      throw new Error(`[nuxt-feathers-zod] OIDC strategy '${this.name}' requires an issuer.`)
    if (!config?.audience || (Array.isArray(config.audience) && config.audience.length === 0))
      throw new Error(`[nuxt-feathers-zod] OIDC strategy '${this.name}' requires an audience.`)
    assertSecureIssuer(config)
  }

  private async resolveJwks(): Promise<ReturnType<typeof createRemoteJWKSet>> {
    if (!this.jwksPromise) {
      const pending = (async () => {
        const config = this.configuration
        let jwksUri = config.jwksUri

        if (!jwksUri) {
          const issuer = normalizeIssuer(config.issuer)
          const discoveryUrl = new URL(`${issuer}/.well-known/openid-configuration`)
          const timeoutMs = Math.min(Math.max(config.discoveryTimeoutMs ?? 5_000, 500), 30_000)
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), timeoutMs)
          let response: Response
          try {
            response = await fetch(discoveryUrl, {
              headers: { accept: 'application/json' },
              signal: controller.signal,
            })
          }
          finally {
            clearTimeout(timeout)
          }
          if (!response.ok) {
            throw new NotAuthenticated(
              `[nuxt-feathers-zod] OIDC discovery failed for '${issuer}' (${response.status}).`,
            )
          }
          const metadata = await response.json() as OidcDiscoveryDocument
          if (normalizeIssuer(metadata.issuer || '') !== issuer) {
            throw new NotAuthenticated('[nuxt-feathers-zod] OIDC discovery issuer mismatch.')
          }
          jwksUri = metadata.jwks_uri
        }

        if (!jwksUri)
          throw new NotAuthenticated('[nuxt-feathers-zod] OIDC provider did not expose a jwks_uri.')

        const jwksUrl = assertSecureRemoteUrl(jwksUri, 'OIDC JWKS URL', config.allowInsecureHttp === true)
        const timeoutDuration = Math.min(Math.max(config.discoveryTimeoutMs ?? 5_000, 500), 30_000)
        return createRemoteJWKSet(jwksUrl, { timeoutDuration })
      })()
      this.jwksPromise = pending.catch((error) => {
        this.jwksPromise = undefined
        throw error
      })
    }

    return this.jwksPromise
  }

  private async resolveEntity(payload: Record<string, unknown>, params: AuthenticationParams): Promise<unknown> {
    const config = this.configuration
    const allowClaimsOnlyIdentity = config.allowClaimsOnlyIdentity === true || config.failOpen === true
    const authenticationConfig = (this.authentication?.configuration ?? {}) as NfzAuthenticationServiceConfiguration
    const entity = authenticationConfig.entity
    if (entity === null)
      return undefined

    const subject = typeof payload.sub === 'string' ? payload.sub : ''
    if (!subject)
      throw new NotAuthenticated('[nuxt-feathers-zod] OIDC token does not contain a subject.')

    const userServicePath = config.userService || authenticationConfig.service
    const subjectField = config.subjectField || 'oidcSubject'
    if (!userServicePath) {
      if (allowClaimsOnlyIdentity)
        return { ...payload, [subjectField]: subject }
      throw new NotAuthenticated('[nuxt-feathers-zod] OIDC user service is not configured.')
    }

    try {
      const service = this.app?.service(userServicePath)
      if (!service)
        throw new NotAuthenticated(`[nuxt-feathers-zod] OIDC user service '${userServicePath}' is unavailable.`)

      const result = await service.find({
        ...params,
        provider: undefined,
        paginate: false,
        query: { [subjectField]: subject, $limit: 1 },
      })
      const first = Array.isArray(result) ? result[0] : result?.data?.[0]
      if (first)
        return first

      if (config.userProvisioning === 'create-if-missing') {
        return await service.create({
          [subjectField]: subject,
          email: payload.email,
          username: payload.preferred_username,
        }, { ...params, provider: undefined })
      }

      if (allowClaimsOnlyIdentity)
        return { ...payload, [subjectField]: subject }

      throw new NotAuthenticated('[nuxt-feathers-zod] OIDC identity is valid but no local user is mapped.')
    }
    catch (error) {
      if (error instanceof NotAuthenticated)
        throw error
      throw new NotAuthenticated('[nuxt-feathers-zod] OIDC user resolution failed.', error)
    }
  }

  async authenticate(authentication: AuthenticationRequest, params: AuthenticationParams): Promise<AuthenticationResult> {
    const accessToken = typeof authentication.accessToken === 'string'
      ? authentication.accessToken
      : typeof authentication.access_token === 'string'
        ? authentication.access_token
        : undefined

    if (!accessToken)
      throw new NotAuthenticated('[nuxt-feathers-zod] OIDC access token is required.')

    try {
      const config = this.configuration
      const jwks = await this.resolveJwks()
      const verified = await jwtVerify(accessToken, jwks, {
        issuer: normalizeIssuer(config.issuer),
        audience: config.audience,
        algorithms: config.algorithms || ['RS256'],
      })
      const payload = verified.payload as Record<string, unknown>
      const authenticationConfig = (this.authentication?.configuration ?? {}) as NfzAuthenticationServiceConfiguration
      const entityKey = authenticationConfig.entity
      const entity = await this.resolveEntity(payload, params)
      const principal = createNfzPrincipal({
        provider: this.name || 'oidc',
        user: entity,
        payload,
        claims: config.claims,
        defaultAssuranceLevel: config.assuranceLevel || 'aal2',
      })

      if (!principal)
        throw new NotAuthenticated('[nuxt-feathers-zod] OIDC principal could not be normalized.')

      return {
        principal,
        authentication: {
          strategy: this.name || 'oidc',
          accessToken,
          payload,
        },
        ...(entityKey && entity ? { [entityKey]: entity } : {}),
      }
    }
    catch (error) {
      if (error instanceof NotAuthenticated)
        throw error
      throw new NotAuthenticated('[nuxt-feathers-zod] OIDC token validation failed.', error)
    }
  }

  async parse(req: IncomingMessage): Promise<AuthenticationRequest | null> {
    const config = this.configuration
    const raw = headerValue(req, config.header || 'authorization')
    if (!raw)
      return null

    const token = parseToken(raw, config.schemes || ['Bearer'])
    if (!token)
      return null

    try {
      const payload = decodeJwt(token)
      if (normalizeIssuer(String(payload.iss || '')) !== normalizeIssuer(config.issuer))
        return null
      if (!audienceMatches(payload.aud, config.audience))
        return null
      return { strategy: this.name || 'oidc', accessToken: token }
    }
    catch {
      return null
    }
  }
}
