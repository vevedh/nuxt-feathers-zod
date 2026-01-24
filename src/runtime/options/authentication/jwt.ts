import type { AuthClientOptions } from './client'
import type { SignOptions } from './jwt-types'
import { klona } from 'klona'

export type AuthJwtOptions = Partial<SignOptions>

export const authJwtDefaults: AuthJwtOptions = {
  header: {
    alg: 'HS256',
    typ: 'access',
  },
  audience: 'http://localhost',
  algorithm: 'HS256',
  expiresIn: '1d',
}

export function getAuthJwtDefaults(): AuthJwtOptions {
  return klona(authJwtDefaults)
}

export const authClientJwtDefaults: AuthClientOptions = {
  storageKey: 'feathers-jwt',
}

export function getAuthClientJwtDefaults(): AuthClientOptions {
  return klona(authClientJwtDefaults)
}
