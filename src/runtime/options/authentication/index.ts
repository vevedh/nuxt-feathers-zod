import type { Import } from 'unimport'
import type { ModuleOptions } from '..'
import type { AuthClientOptions } from './client'
import type { AuthJwtOptions } from './jwt'
import type { AuthLocalOptions } from './local'
import { capitalCase } from 'change-case'
import defu from 'defu'
import { klona } from 'klona'
import consola from 'consola'
import { digest } from 'ohash'
import { NuxtFeathersError } from '../../errors'
import { resolveAuthClientOptions } from './client'
import { getAuthJwtDefaults } from './jwt'
import { getAuthLocalDefaults } from './local'

export type AuthStrategy = 'jwt' | 'local' | 'oauth'

export type AuthStrategies = AuthStrategy[]

export interface StaticAuthOptions {
  service: string
  entity: string
  entityClass: string
}

export interface DefaultAuthOptions extends StaticAuthOptions {
  authStrategies: AuthStrategies
  secret: string
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

export interface PublicAuthOptions {
  authStrategies: AuthStrategies
  servicePath: string
  entityKey: string
  entityClass: string
  client: AuthClientOptions
}

export const authStaticDefaults: StaticAuthOptions = {
  entity: 'user',
  entityClass: 'User',
  service: 'users',
}

export function getAuthStaticDefaults(): StaticAuthOptions {
  return klona(authStaticDefaults)
}

export const defaultAuthStrategies: AuthStrategies = ['local', 'jwt']

export function getDefaultAuthStrategies(): AuthStrategies {
  return klona(defaultAuthStrategies)
}

export function getAuthDefaults(appDir: string, authStrategies?: AuthStrategies): ResolvedAuthOptionsWithOutEntityImport {
  authStrategies ||= getDefaultAuthStrategies()
  const authOptions: ResolvedAuthOptionsWithOutEntityImport = {
    ...getAuthStaticDefaults(),
    secret: digest(appDir),
    authStrategies,
  }
  if (authStrategies.includes('jwt'))
    authOptions.jwtOptions = getAuthJwtDefaults()
  if (authStrategies.includes('local'))
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

export function resolveAuthOptions(
  auth: ModuleOptions['auth'],
  ctx: ResolveAuthContext,
  servicesImports: Import[],
  appDir: string,
): ResolvedAuthOptionsOrDisabled {
  if (auth === false)
    return false

  let authOptions: ResolvedAuthOptionsWithOutEntityImport

  const authDefaults = getAuthDefaults(appDir, (auth as AuthOptions)?.authStrategies)

  if (auth === true || auth == null) {
    authOptions = authDefaults
  }
  else {
    authOptions = defu(auth, authDefaults) as ResolvedAuthOptionsWithOutEntityImport
    authOptions.authStrategies = authDefaults.authStrategies
    if (!authOptions.authStrategies?.includes('jwt'))
      delete authOptions.jwtOptions
    if (!authOptions.authStrategies?.includes('local'))
      delete authOptions.local
  }

  if (ctx.client)
    authOptions.client = resolveAuthClientOptions(authOptions.client, authOptions.authStrategies)
  else
    delete authOptions.client

  const entityClass = getEntityClass(auth as AuthOptions)

  // Embedded mode expects local service schema imports so we can type the auth entity.
  if (ctx.mode === 'embedded') {
    // DX guard: if auth is enabled but we didn't detect any local service schemas, fail fast with
    // a clear, actionable message (instead of the confusing "Entity class User not found").
    if (!servicesImports.length) {
      if (shouldDegradeEmbeddedAuthForMissingEntity()) {
        warnPrepareSafeEmbeddedAuth(
          `No local service schemas were detected. Generate the users service with "bunx nuxt-feathers-zod add service users --auth" or disable auth in nuxt.config. `
          + `Set NFZ_AUTH_PREPARE_STRICT=true to restore the hard failure.`,
        )
        return false
      }
      throw new NuxtFeathersError(
        `[nuxt-feathers-zod] Auth is enabled but no service schemas were detected.

`
        + `Embedded auth requires a local users service/schema so the module can import the auth entity class (${entityClass}).

`
        + `Fix:
`
        + `  1) Ensure you have: feathers: { servicesDirs: ['services'] } (or your custom dir)
`
        + `  2) Generate the users service: bunx nuxt-feathers-zod add service users --auth
`
        + `
Or disable auth in nuxt.config: feathers: { auth: false }
`,
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
    const resolvedAuth: ResolvedAuthOptions = {
      ...authOptions,
      entityClass,
      entityImport,
    }
    return resolvedAuth
  }

  // Remote mode: do not require local schema imports.
  // If the user provided an entityImport explicitly, keep it (best-effort).
  const explicit = (auth as any)?.entityImport as Import | undefined
  if (explicit?.from)
    explicit.from = explicit.from.replace(/\.ts$/, '')

  const resolvedRemote: ResolvedAuthOptions = {
    ...authOptions,
    entityClass,
    entityImport: explicit as any,
  }

  return resolvedRemote
}
