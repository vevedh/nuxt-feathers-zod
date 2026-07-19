import type { Import } from 'unimport'
import type { ModuleOptions } from '..'
import type { NfzPrincipalClaimsOptions } from '../../auth/principal'
import type { NfzJwtKeyOptions } from '../../auth/security'
import type {
  NfzAuthenticationProviderOptions,
  NfzAuthenticationProviders,
} from '../../auth/types'
import type { AuthClientOptions } from './client'
import type { AuthJwtOptions } from './jwt'
import type { AuthLocalOptions } from './local'
import { capitalCase } from 'change-case'
import defu from 'defu'
import { klona } from 'klona'
import consola from 'consola'
import { NuxtFeathersError } from '../../errors'
import { resolveAuthClientOptions } from './client'
import { getAuthJwtDefaults } from './jwt'
import { getAuthLocalDefaults } from './local'

export type AuthStrategy = string
export type AuthStrategies = AuthStrategy[]

export interface StaticAuthOptions {
  service: string
  entity: string
  entityClass: string
  authenticationService: string
}

export interface AuthPrincipalOptions {
  claims?: NfzPrincipalClaimsOptions
}

export interface DefaultAuthOptions extends StaticAuthOptions {
  authStrategies: AuthStrategies
  parseStrategies: AuthStrategies
  providers: NfzAuthenticationProviders
  secret?: string
  keys?: NfzJwtKeyOptions
  principal?: AuthPrincipalOptions
  entityImport?: Import
}

export interface AdditionalAuthOptions {
  jwtOptions?: AuthJwtOptions
  local?: AuthLocalOptions
  client?: AuthClientOptions
}

export type AuthOptions = Partial<DefaultAuthOptions> & AdditionalAuthOptions

export interface ResolvedAuthOptions extends DefaultAuthOptions, AdditionalAuthOptions {
  entityImport: Import
}

export type ResolvedAuthOptionsOrDisabled = ResolvedAuthOptions | false
export type ResolvedAuthOptionsWithOutEntityImport = Omit<ResolvedAuthOptions, 'entityImport'>

export interface PublicAuthProviderOptions {
  type: string
  enabled: boolean
  parse: boolean
  issueAccessToken: boolean
  assuranceLevel?: string
  issuer?: string
  audience?: string | string[]
  header?: string
}

export interface PublicAuthOptions {
  authStrategies: AuthStrategies
  parseStrategies: AuthStrategies
  providers: Record<string, PublicAuthProviderOptions>
  servicePath: string
  entityKey: string
  entityClass: string
  client: AuthClientOptions
  local?: {
    usernameField?: string
    passwordField?: string
    entityUsernameField?: string
    entityPasswordField?: string
    errorMessage?: string
  }
}

export const authStaticDefaults: StaticAuthOptions = {
  entity: 'user',
  entityClass: 'User',
  service: 'users',
  authenticationService: 'authentication',
}

export function getAuthStaticDefaults(): StaticAuthOptions {
  return klona(authStaticDefaults)
}

export const defaultAuthStrategies: AuthStrategies = ['local', 'jwt']

export function getDefaultAuthStrategies(): AuthStrategies {
  return klona(defaultAuthStrategies)
}

function inferProviderType(name: string): string {
  return name === 'jwt' || name === 'local' || name === 'oauth' ? name : 'custom'
}

function providerDefaults(name: string): NfzAuthenticationProviderOptions {
  if (name === 'local')
    return { type: 'local', ...getAuthLocalDefaults(), parse: false, issueAccessToken: true }
  if (name === 'jwt')
    return { type: 'jwt', parse: true, issueAccessToken: true }
  if (name === 'oauth')
    return { type: 'oauth', parse: false, issueAccessToken: true }
  return { type: inferProviderType(name), parse: false, issueAccessToken: true }
}

function defaultProviderParse(provider: NfzAuthenticationProviderOptions): boolean {
  return provider.type === 'jwt' || provider.type === 'oidc' || provider.type === 'api-key'
}

function ensureJwtVerificationProvider(
  providers: NfzAuthenticationProviders,
  declarativeProvidersConfigured: boolean,
): void {
  if (!declarativeProvidersConfigured)
    return

  const enabled = Object.values(providers).filter(provider => provider.enabled !== false)
  const issuesNfzTokens = enabled.some(provider => provider.type !== 'jwt' && provider.issueAccessToken !== false)
  const hasJwt = enabled.some(provider => provider.type === 'jwt')
  if (issuesNfzTokens && !hasJwt)
    providers.jwt = providerDefaults('jwt')
}

function resolveProviders(input: AuthOptions, strategies: AuthStrategies): NfzAuthenticationProviders {
  const providers: NfzAuthenticationProviders = {}
  for (const strategy of strategies)
    providers[strategy] = providerDefaults(strategy)

  for (const [name, configured] of Object.entries(input.providers || {})) {
    const base = providers[name] || providerDefaults(name)
    const resolved = defu(configured, base) as NfzAuthenticationProviderOptions
    if (!resolved.type)
      resolved.type = inferProviderType(name)
    if (!Object.hasOwn(configured, 'parse'))
      resolved.parse = defaultProviderParse(resolved)
    if (!Object.hasOwn(configured, 'issueAccessToken'))
      resolved.issueAccessToken = resolved.type !== 'api-key'
    providers[name] = resolved
  }

  if (input.local && providers.local)
    providers.local = defu(input.local, providers.local) as NfzAuthenticationProviderOptions

  ensureJwtVerificationProvider(providers, Boolean(input.providers && Object.keys(input.providers).length))
  return providers
}

function enabledProviderNames(providers: NfzAuthenticationProviders): string[] {
  return Object.entries(providers)
    .filter(([, provider]) => provider.enabled !== false)
    .map(([name]) => name)
}

function resolveParseStrategies(
  input: AuthOptions,
  providers: NfzAuthenticationProviders,
): AuthStrategies {
  if (input.parseStrategies?.length)
    return [...input.parseStrategies]

  return Object.entries(providers)
    .filter(([, provider]) => provider.enabled !== false && (provider.parse ?? defaultProviderParse(provider)))
    .sort(([, left], [, right]) => {
      const priority = (provider: NfzAuthenticationProviderOptions) => provider.type === 'jwt' ? 1 : 0
      return priority(left) - priority(right)
    })
    .map(([name]) => name)
}

export function getAuthDefaults(_appDir: string, authStrategies?: AuthStrategies): ResolvedAuthOptionsWithOutEntityImport {
  const strategies = authStrategies?.length ? [...authStrategies] : getDefaultAuthStrategies()
  const providers = resolveProviders({ authStrategies: strategies }, strategies)
  const authOptions: ResolvedAuthOptionsWithOutEntityImport = {
    ...getAuthStaticDefaults(),
    authStrategies: strategies,
    parseStrategies: resolveParseStrategies({}, providers),
    providers,
  }
  if (strategies.includes('jwt'))
    authOptions.jwtOptions = getAuthJwtDefaults()
  if (strategies.includes('local'))
    authOptions.local = getAuthLocalDefaults()

  return authOptions
}

function getEntityClass(authOptions: AuthOptions): string {
  return authOptions.entityClass || capitalCase(authOptions.entity || '') || authStaticDefaults.entityClass
}

export const authClientDefaultOptions: AuthClientOptions = {
  storageKey: 'feathers-jwt',
}

export interface ResolveAuthContext {
  client: boolean
  mode: 'embedded' | 'remote'
}

function isPrepareLikePhase(): boolean {
  const argv = process.argv.join(' ').toLowerCase()
  const lifecycle = String(process.env.npm_lifecycle_event || '').toLowerCase()
  const command = String(process.env.npm_command || '').toLowerCase()
  return argv.includes(' prepare')
    || argv.endsWith('prepare')
    || argv.includes('nuxi prepare')
    || argv.includes('nuxt prepare')
    || lifecycle === 'postinstall'
    || lifecycle === 'prepare'
    || command === 'prepare'
}

function shouldDegradeEmbeddedAuthForMissingEntity(): boolean {
  return process.env.NFZ_AUTH_PREPARE_STRICT !== 'true' && isPrepareLikePhase()
}

function warnPrepareSafeEmbeddedAuth(details: string): void {
  consola.warn(
    `[nuxt-feathers-zod] Embedded auth is enabled but could not resolve the auth entity during prepare/postinstall. `
    + `The module will continue with auth disabled for this pass. ${details}`,
  )
}

function resolveConfiguredAuth(input: AuthOptions, appDir: string): ResolvedAuthOptionsWithOutEntityImport {
  const explicitProviders = input.providers && Object.keys(input.providers).length > 0
  const strategies = input.authStrategies?.length
    ? [...input.authStrategies]
    : explicitProviders
      ? enabledProviderNames(input.providers || {})
      : getDefaultAuthStrategies()
  const defaults = getAuthDefaults(appDir, strategies)
  const providers = resolveProviders(input, strategies)
  const resolved = defu(input, defaults) as ResolvedAuthOptionsWithOutEntityImport

  resolved.authStrategies = enabledProviderNames(providers)
  resolved.parseStrategies = resolveParseStrategies(input, providers)
  resolved.providers = providers

  const hasJwtProvider = Object.values(providers).some(provider => provider.enabled !== false && provider.type === 'jwt')
  const hasLocalProvider = Object.values(providers).some(provider => provider.enabled !== false && provider.type === 'local')
  if (hasJwtProvider)
    resolved.jwtOptions ||= getAuthJwtDefaults()
  else
    delete resolved.jwtOptions
  if (!hasLocalProvider)
    delete resolved.local

  return resolved
}

export function resolveAuthOptions(
  auth: ModuleOptions['auth'],
  ctx: ResolveAuthContext,
  servicesImports: Import[],
  appDir: string,
): ResolvedAuthOptionsOrDisabled {
  if (auth === false)
    return false

  const input = auth === true || auth == null ? {} : auth as AuthOptions
  const authOptions = resolveConfiguredAuth(input, appDir)

  if (ctx.client)
    authOptions.client = resolveAuthClientOptions(authOptions.client, authOptions.authStrategies)
  else
    delete authOptions.client

  const entityClass = getEntityClass(input)

  if (ctx.mode === 'embedded') {
    if (!servicesImports.length) {
      if (shouldDegradeEmbeddedAuthForMissingEntity()) {
        warnPrepareSafeEmbeddedAuth(
          `No local service schemas were detected. Generate the users service with "bunx nuxt-feathers-zod add service users --auth" or disable auth in nuxt.config. `
          + `Set NFZ_AUTH_PREPARE_STRICT=true to restore the hard failure.`,
        )
        return false
      }
      throw new NuxtFeathersError(
        `[nuxt-feathers-zod] Auth is enabled but no service schemas were detected.\n\n`
        + `Embedded auth requires a local users service/schema so the module can import the auth entity class (${entityClass}).\n\n`
        + `Fix:\n`
        + `  1) Ensure you have: feathers: { servicesDirs: ['services'] } (or your custom dir)\n`
        + `  2) Generate the users service: bunx nuxt-feathers-zod add service users --auth\n`
        + `\nOr disable auth in nuxt.config: feathers: { auth: false }\n`,
      )
    }
    const entityImport = servicesImports.find(i => i.as === entityClass)
    if (!entityImport) {
      if (shouldDegradeEmbeddedAuthForMissingEntity()) {
        warnPrepareSafeEmbeddedAuth(
          `Service schemas were detected but the entity class "${entityClass}" was not found in imports. `
          + `Regenerate the users service/schema or set NFZ_AUTH_PREPARE_STRICT=true to restore the hard failure.`,
        )
        return false
      }
      throw new NuxtFeathersError(`Entity class ${entityClass} not found in services imports`)
    }

    entityImport.from = entityImport.from.replace(/\.ts$/, '')
    return {
      ...authOptions,
      entityClass,
      entityImport,
    }
  }

  const explicit = input.entityImport as Import | undefined
  if (explicit?.from)
    explicit.from = explicit.from.replace(/\.ts$/, '')

  return {
    ...authOptions,
    entityClass,
    entityImport: explicit as Import,
  }
}
