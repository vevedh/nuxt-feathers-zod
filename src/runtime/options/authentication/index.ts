import type { Import } from 'unimport'
import type { ModuleOptions } from '..'
import type { AuthClientOptions } from './client'
import type { AuthJwtOptions } from './jwt'
import type { AuthLocalOptions } from './local'
import { capitalCase } from 'change-case'
import defu from 'defu'
import { klona } from 'klona'
import { digest } from 'ohash'
import { NuxtFeathersError } from '../../errors'
import { resolveAuthClientOptions } from './client'
import { getAuthJwtDefaults } from './jwt'
import { getAuthLocalDefaults } from './local'

export type AuthStrategy = 'jwt' | 'local' // TODO: support oauth

export type AuthStrategies = [AuthStrategy] | [AuthStrategy, AuthStrategy]

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

export function resolveAuthOptions(auth: ModuleOptions['auth'], client: boolean, servicesImports: Import[], appDir: string): ResolvedAuthOptionsOrDisabled {
  if (auth === false)
    return false

  let authOptions: ResolvedAuthOptionsWithOutEntityImport

  const authDefaults = getAuthDefaults(appDir, (auth as AuthOptions)?.authStrategies)

  if (auth === true) {
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

  if (client)
    authOptions.client = resolveAuthClientOptions(authOptions.client, authOptions.authStrategies)
  else
    delete authOptions.client

  const entityClass = getEntityClass(auth as AuthOptions)
  const entityImport = servicesImports.find(i => i.as === entityClass)
  if (!entityImport)
    throw new NuxtFeathersError(`Entity class ${entityClass} not found in services imports`)

  entityImport.from = entityImport.from.replace(/\.ts$/, '')
  const resolvedAuth: ResolvedAuthOptions = {
    ...authOptions,
    entityClass,
    entityImport,
  }

  console.log(resolvedAuth)

  return resolvedAuth
}
