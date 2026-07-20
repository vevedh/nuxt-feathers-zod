import type {
  AuthenticationParams,
  AuthenticationRequest,
  AuthenticationResult,
} from '@feathersjs/authentication'
import type { Buffer } from 'node:buffer'
import type { NfzResolvedJwtKeys } from './security'
import type { NfzAuthenticationProviders } from './types'
import { AuthenticationService } from '@feathersjs/authentication'
import { createNfzPrincipal, toNfzPrincipalJwtClaims } from './principal'

export interface NfzAuthenticationServiceOptions {
  providers: NfzAuthenticationProviders
}

export class NfzAuthenticationService extends AuthenticationService {
  readonly nfzProviders: NfzAuthenticationProviders
  readonly nfzKeys: NfzResolvedJwtKeys

  constructor(
    app: any,
    configKey: string,
    options: NfzAuthenticationServiceOptions,
    keys: NfzResolvedJwtKeys,
  ) {
    super(app, configKey)
    this.nfzProviders = options.providers
    this.nfzKeys = keys
  }

  async createAccessToken(payload: string | Buffer | object, optsOverride?: any, secretOverride?: any): Promise<string> {
    const {
      algorithm: _ignoredAlgorithm,
      algorithms: _ignoredAlgorithms,
      header: overrideHeader,
      ...safeOverrides
    } = optsOverride || {}
    const options = {
      ...safeOverrides,
      algorithm: this.nfzKeys.algorithm,
      header: {
        ...(overrideHeader || {}),
        alg: this.nfzKeys.algorithm,
        ...(this.nfzKeys.keyId ? { kid: this.nfzKeys.keyId } : {}),
      },
    }
    return super.createAccessToken(payload, options, secretOverride || this.nfzKeys.signingKey)
  }

  async verifyAccessToken(accessToken: string, optsOverride?: any, secretOverride?: any): Promise<any> {
    // Feathers normalizes the singular `algorithm` option into the
    // jsonwebtoken `algorithms` allowlist and removes the singular field.
    // Supplying both fields would leave an unsupported `algorithm` option in
    // jsonwebtoken.verify(), so caller-provided values are stripped here.
    const {
      algorithm: _ignoredAlgorithm,
      algorithms: _ignoredAlgorithms,
      ...safeOverrides
    } = optsOverride || {}
    const options = {
      ...safeOverrides,
      algorithm: this.nfzKeys.algorithm,
    }
    return super.verifyAccessToken(accessToken, options, secretOverride || this.nfzKeys.verificationKey)
  }

  async authenticate(
    authentication: AuthenticationRequest,
    params: AuthenticationParams,
    ...allowed: string[]
  ): Promise<AuthenticationResult> {
    const result = await super.authenticate(authentication, params, ...allowed)
    const strategy = authentication?.strategy || result.authentication?.strategy || 'unknown'
    const payload = result.authentication?.payload
    const entityKey = this.configuration.entity
    const user = entityKey ? result[entityKey] : undefined
    const providerOptions = this.nfzProviders[strategy]
    const principal = createNfzPrincipal({
      provider: strategy,
      user,
      payload,
      principal: result.principal,
      claims: providerOptions && 'claims' in providerOptions ? providerOptions.claims : undefined,
      defaultAssuranceLevel: providerOptions?.assuranceLevel || 'aal1',
    })

    return principal ? { ...result, principal } : result
  }

  async getPayload(authResult: AuthenticationResult, params: AuthenticationParams): Promise<Record<string, unknown>> {
    const payload = await super.getPayload(authResult, params)
    const strategy = authResult.authentication?.strategy || 'unknown'
    const entityKey = this.configuration.entity
    const user = entityKey ? authResult[entityKey] : undefined
    const principal = createNfzPrincipal({
      provider: strategy,
      user,
      payload: authResult.authentication?.payload,
      principal: authResult.principal,
      defaultAssuranceLevel: this.nfzProviders[strategy]?.assuranceLevel || 'aal1',
    })

    if (!principal)
      return payload

    return {
      ...payload,
      nfz: toNfzPrincipalJwtClaims(principal),
    }
  }

  async create(data: AuthenticationRequest, params: AuthenticationParams = {}): Promise<AuthenticationResult> {
    const normalized: AuthenticationRequest = { ...(data || {}) }
    if (!normalized.accessToken) {
      normalized.accessToken = normalized.access_token
        || normalized.jwt
        || normalized.token
        || normalized.bearer
    }
    const strategy = normalized.strategy || ''
    const provider = this.nfzProviders[strategy]
    if (provider?.issueAccessToken === false)
      return this.authenticate(normalized, params, strategy)
    return super.create(normalized, params)
  }
}
