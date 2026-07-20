import type { AuthenticationService, AuthenticationStrategy } from '@feathersjs/authentication'
import type { NfzJwtKeyOptions } from './security'
import type {
  NfzAuthenticationProviderFactory,
  NfzAuthenticationProviderOptions,
  NfzAuthenticationProviderRegistration,
  NfzAuthenticationProviders,
} from './types'
import { JWTStrategy } from '@feathersjs/authentication'
import { LocalStrategy } from '@feathersjs/authentication-local'
import { oauth } from '@feathersjs/authentication-oauth'
import { resolveNfzJwtKeys } from './security'
import { NfzAuthenticationService } from './service'
import { NfzApiKeyStrategy } from './strategies/api-key'
import { NfzOidcStrategy } from './strategies/oidc'

export interface ConfigureNfzAuthenticationOptions {
  service?: string
  entity?: string | null
  entityClass?: string
  entityId?: string
  authStrategies?: string[]
  parseStrategies?: string[]
  jwtOptions?: Record<string, unknown>
  local?: Record<string, unknown>
  client?: Record<string, unknown>
  providers?: NfzAuthenticationProviders
  keys?: NfzJwtKeyOptions
  secret?: string
  [key: string]: unknown
}

function inferredProvider(name: string, options: ConfigureNfzAuthenticationOptions): NfzAuthenticationProviderOptions {
  if (name === 'local')
    return { type: 'local', ...(options.local || {}) }
  if (name === 'jwt')
    return { type: 'jwt' }
  if (name === 'oauth')
    return { type: 'oauth' }
  return { type: 'custom' }
}

function resolveProviders(options: ConfigureNfzAuthenticationOptions): NfzAuthenticationProviders {
  const providers: NfzAuthenticationProviders = { ...(options.providers || {}) }
  for (const name of options.authStrategies || []) {
    if (!providers[name])
      providers[name] = inferredProvider(name, options)
  }

  const declarativeProvidersConfigured = Boolean(options.providers && Object.keys(options.providers).length)
  const enabled = Object.values(providers).filter(provider => provider.enabled !== false)
  const issuesNfzTokens = enabled.some(provider => provider.type !== 'jwt' && provider.issueAccessToken !== false)
  const hasJwt = enabled.some(provider => provider.type === 'jwt')
  if (declarativeProvidersConfigured && issuesNfzTokens && !hasJwt)
    providers.jwt = { type: 'jwt', parse: true, issueAccessToken: true }

  return providers
}

function providerConfiguration(provider: NfzAuthenticationProviderOptions): Record<string, unknown> {
  const { type: _type, enabled: _enabled, parse: _parse, issueAccessToken: _issue, ...configuration } = provider
  return configuration
}

function defaultParse(provider: NfzAuthenticationProviderOptions): boolean {
  const type = provider.type
  return type === 'jwt' || type === 'oidc' || type === 'api-key'
}

function defaultIssueAccessToken(provider: NfzAuthenticationProviderOptions): boolean {
  return provider.type !== 'api-key'
}

export class NfzAuthenticationProviderRegistry {
  private readonly factories = new Map<string, NfzAuthenticationProviderFactory>()
  private readonly registrations = new Map<string, NfzAuthenticationProviderRegistration>()

  constructor(readonly app: any) {
    this.registerFactory('jwt', () => new JWTStrategy())
    this.registerFactory('local', () => new LocalStrategy())
    this.registerFactory('oidc', () => new NfzOidcStrategy())
    this.registerFactory('api-key', () => new NfzApiKeyStrategy())
  }

  registerFactory(type: string, factory: NfzAuthenticationProviderFactory): this {
    if (!type.trim())
      throw new Error('[nuxt-feathers-zod] Authentication provider type must not be empty.')
    this.factories.set(type, factory)
    return this
  }

  register(
    authentication: AuthenticationService,
    name: string,
    strategy: AuthenticationStrategy,
    options: Pick<NfzAuthenticationProviderRegistration, 'type' | 'issueAccessToken' | 'parse'> & {
      configuration?: Record<string, unknown>
    },
  ): NfzAuthenticationProviderRegistration {
    const normalizedName = name.trim()
    if (!normalizedName)
      throw new Error('[nuxt-feathers-zod] Authentication provider name must not be empty.')
    if (this.registrations.has(normalizedName))
      throw new Error(`[nuxt-feathers-zod] Authentication provider '${normalizedName}' is already registered.`)

    const current = this.app.get?.('authentication') || {}
    const providerMetadata = current.providers?.[normalizedName] || {
      type: options.type,
      parse: options.parse,
      issueAccessToken: options.issueAccessToken,
      ...(options.configuration || {}),
    }
    const nextConfiguration = {
      ...current,
      ...(options.configuration ? { [normalizedName]: options.configuration } : {}),
      authStrategies: [...new Set([...(current.authStrategies || []), normalizedName])],
      parseStrategies: options.parse
        ? [...new Set([...(current.parseStrategies || []), normalizedName])]
        : [...(current.parseStrategies || [])],
      providers: {
        ...(current.providers || {}),
        [normalizedName]: providerMetadata,
      },
    }

    this.app.set?.('authentication', nextConfiguration)
    try {
      authentication.register(normalizedName, strategy)
    }
    catch (error) {
      this.app.set?.('authentication', current)
      throw error
    }

    const registration: NfzAuthenticationProviderRegistration = {
      name: normalizedName,
      strategy,
      type: options.type,
      parse: options.parse,
      issueAccessToken: options.issueAccessToken,
    }
    this.registrations.set(normalizedName, registration)

    if (authentication instanceof NfzAuthenticationService && !authentication.nfzProviders[normalizedName]) {
      authentication.nfzProviders[normalizedName] = providerMetadata as NfzAuthenticationProviderOptions
    }

    return registration
  }

  configure(
    authentication: AuthenticationService,
    providers: NfzAuthenticationProviders,
  ): NfzAuthenticationProviderRegistration[] {
    for (const [name, provider] of Object.entries(providers)) {
      if (provider.enabled === false || provider.type === 'oauth')
        continue
      const type = provider.type || name
      const factory = this.factories.get(type)
      if (!factory) {
        if (type === 'custom')
          continue
        throw new Error(`[nuxt-feathers-zod] No authentication provider factory is registered for type '${type}'.`)
      }
      const strategy = factory({ app: this.app, name, options: provider })
      this.register(authentication, name, strategy, {
        type,
        parse: provider.parse ?? defaultParse(provider),
        issueAccessToken: provider.issueAccessToken ?? defaultIssueAccessToken(provider),
      })
    }
    return this.list()
  }

  list(): NfzAuthenticationProviderRegistration[] {
    return [...this.registrations.values()]
  }
}

export async function configureNfzAuthentication(
  app: any,
  rawOptions: ConfigureNfzAuthenticationOptions,
): Promise<void> {
  const providers = resolveProviders(rawOptions)
  const asymmetricKeysConfigured = rawOptions.keys?.mode === 'asymmetric'
    || Boolean(rawOptions.keys?.privateKey || rawOptions.keys?.publicKey)
  const legacyAlgorithm = !asymmetricKeysConfigured && typeof rawOptions.jwtOptions?.algorithm === 'string'
    ? rawOptions.jwtOptions.algorithm
    : undefined
  const keys = resolveNfzJwtKeys({
    ...rawOptions.keys,
    secret: rawOptions.keys?.secret || rawOptions.secret,
    algorithm: rawOptions.keys?.algorithm || legacyAlgorithm,
  })
  const enabledProviders = Object.entries(providers).filter(([, provider]) => provider.enabled !== false)
  const authStrategies = rawOptions.authStrategies?.length
    ? [...rawOptions.authStrategies]
    : enabledProviders.map(([name]) => name)
  const parseStrategies = rawOptions.parseStrategies?.length
    ? [...rawOptions.parseStrategies]
    : enabledProviders
        .filter(([, provider]) => provider.parse ?? defaultParse(provider))
        .sort(([, left], [, right]) => {
          const priority = (provider: NfzAuthenticationProviderOptions) => provider.type === 'jwt' ? 1 : 0
          return priority(left) - priority(right)
        })
        .map(([name]) => name)

  const strategyConfig = Object.fromEntries(
    enabledProviders.map(([name, provider]) => [name, providerConfiguration(provider)]),
  )
  const {
    algorithm: _ignoredJwtAlgorithm,
    algorithms: _ignoredJwtAlgorithms,
    header: rawJwtHeader,
    ...safeJwtOptions
  } = rawOptions.jwtOptions || {}
  const configuration = {
    ...rawOptions,
    ...strategyConfig,
    providers,
    authStrategies,
    parseStrategies,
    secret: keys.signingKey,
    jwtOptions: {
      ...safeJwtOptions,
      algorithm: keys.algorithm,
      header: {
        ...((rawJwtHeader && typeof rawJwtHeader === 'object')
          ? rawJwtHeader as Record<string, unknown>
          : {}),
        alg: keys.algorithm,
        ...(keys.keyId ? { kid: keys.keyId } : {}),
      },
    },
  }

  app.set('authentication', configuration)
  const registry = new NfzAuthenticationProviderRegistry(app)
  const authentication = new NfzAuthenticationService(app, 'authentication', { providers }, keys)
  registry.configure(authentication, providers)
  app.set('nfzAuthenticationProviderRegistry', registry)
  app.set('nfzAuthenticationSecurity', {
    mode: keys.mode,
    algorithm: keys.algorithm,
    keyId: keys.keyId,
    source: keys.source,
  })

  const authenticationServicePath = String(rawOptions.authenticationService || 'authentication').replace(/^\/+/, '')
  app.set('nfzAuthenticationServicePath', authenticationServicePath)
  app.use(authenticationServicePath, authentication)

  if (enabledProviders.some(([, provider]) => provider.type === 'oauth'))
    app.configure(oauth())
}

export function getNfzAuthenticationProviderRegistry(app: any): NfzAuthenticationProviderRegistry | undefined {
  return app.get?.('nfzAuthenticationProviderRegistry')
}

export function registerNfzAuthenticationProvider(
  app: any,
  name: string,
  strategy: AuthenticationStrategy,
  options: {
    type?: string
    parse?: boolean
    issueAccessToken?: boolean
    configuration?: Record<string, unknown>
  } = {},
): NfzAuthenticationProviderRegistration {
  const registry = getNfzAuthenticationProviderRegistry(app)
  const servicePath = app.get?.('nfzAuthenticationServicePath') || 'authentication'
  const authentication = app.service?.(servicePath) as AuthenticationService | undefined
  if (!registry || !authentication)
    throw new Error('[nuxt-feathers-zod] Authentication provider registry is not initialized.')

  return registry.register(authentication, name, strategy, {
    type: options.type || 'custom',
    parse: options.parse ?? false,
    issueAccessToken: options.issueAccessToken ?? true,
    configuration: options.configuration,
  })
}
