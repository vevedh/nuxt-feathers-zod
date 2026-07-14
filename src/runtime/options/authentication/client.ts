import type { AuthStrategies } from '.'
import defu from 'defu'
import { getAuthClientJwtDefaults } from './jwt'

export interface AuthClientOptions {
  header?: string
  scheme?: string
  storageKey?: string
  locationKey?: string
  locationErrorKey?: string
  jwtStrategy?: string
  path?: string // TODO double check this
}

export type ResolvedAuthClientOptions = AuthClientOptions

export function getAuthClientDefaults(authStrategies: AuthStrategies): ResolvedAuthClientOptions {
  if (!authStrategies.includes('jwt'))
    return {}

  return getAuthClientJwtDefaults()
}

export function resolveAuthClientOptions(authClient: AuthClientOptions | undefined, authStrategies: AuthStrategies): ResolvedAuthClientOptions {
  const defaultAuthClient = getAuthClientDefaults(authStrategies)

  const resolvedAuthClient: ResolvedAuthClientOptions = defu(authClient || {}, defaultAuthClient)

  return resolvedAuthClient
}
