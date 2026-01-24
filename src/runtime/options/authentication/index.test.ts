import type { Import } from 'unimport'
import type { AuthStrategies } from './index'
import { createResolver } from '@nuxt/kit'
import { digest } from 'ohash'
import { describe, expect, it } from 'vitest'
import { getAuthClientDefaults } from './client'
import { getAuthDefaults, resolveAuthOptions } from './index'
import { authJwtDefaults } from './jwt'
import { authLocalDefaults } from './local'

describe('resolveAuthOptions', () => {
  const servicesDir = createResolver(import.meta.url).resolve('../../../../services')

  const servicesResolver = createResolver(servicesDir)

  const UserImport: Import = {
    as: 'User',
    from: servicesResolver.resolve('users', 'users.schema.ts'),
    name: 'User',
  }

  const appDir = import.meta.url
  const servicesImports = [UserImport]
  const secret = digest(appDir)

  it('should resolve authDefaults with client if auth and client are true', () => {
    const auth = true

    const result = resolveAuthOptions(auth, true, servicesImports, appDir)
    expect(result).toEqual({
      ...getAuthDefaults(appDir),
      entityImport: UserImport,
      client: getAuthClientDefaults(['jwt']),
    })
  })

  it('should resolve authDefaults without client if auth is true and client is false', () => {
    const auth = true

    const result = resolveAuthOptions(auth, false, servicesImports, appDir)

    expect(result).toEqual({
      ...getAuthDefaults(appDir),
      entityImport: UserImport,
    })
  })

  it('should resolve local if authStrategies has local', () => {
    const authStrategies: AuthStrategies = ['local']
    const auth = {
      authStrategies,
    }

    const result = resolveAuthOptions(auth, false, servicesImports, appDir)

    expect(result).toMatchObject({
      authStrategies,
      local: authLocalDefaults,
    })
  })

  it('should resolve jwtOptions if authStrategies has jwt', () => {
    const authStrategies: AuthStrategies = ['jwt']
    const auth = {
      authStrategies,
    }

    const result = resolveAuthOptions(auth, false, servicesImports, appDir)

    expect(result).toMatchObject({
      authStrategies,
      jwtOptions: authJwtDefaults,
    })
  })

  it('should resolve false if auth is false', () => {
    const auth = false

    const result = resolveAuthOptions(auth, false, servicesImports, appDir)

    expect(result).toEqual(false)
  })
})
