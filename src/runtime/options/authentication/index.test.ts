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

    const result = resolveAuthOptions(auth, { client: true, mode: 'embedded' }, servicesImports, appDir)
    expect(result).toEqual({
      ...getAuthDefaults(appDir),
      entityImport: UserImport,
      client: getAuthClientDefaults(['jwt']),
    })
  })

  it('should resolve authDefaults without client if auth is true and client is false', () => {
    const auth = true

    const result = resolveAuthOptions(auth, { client: false, mode: 'embedded' }, servicesImports, appDir)

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

    const result = resolveAuthOptions(auth, { client: false, mode: 'embedded' }, servicesImports, appDir)

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

    const result = resolveAuthOptions(auth, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result).toMatchObject({
      authStrategies,
      jwtOptions: authJwtDefaults,
    })
  })

  it('should resolve false if auth is false', () => {
    const auth = false

    const result = resolveAuthOptions(auth, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result).toEqual(false)
  })

  it('should degrade to false during prepare/postinstall when embedded auth has no detected services', () => {
    const auth = true
    const previous = process.env.npm_lifecycle_event
    process.env.npm_lifecycle_event = 'postinstall'
    try {
      const result = resolveAuthOptions(auth, { client: false, mode: 'embedded' }, [], appDir)
      expect(result).toEqual(false)
    }
    finally {
      if (previous == null)
        delete process.env.npm_lifecycle_event
      else
        process.env.npm_lifecycle_event = previous
    }
  })

  it('should stay strict outside prepare/postinstall when embedded auth has no detected services', () => {
    const auth = true
    const previous = process.env.npm_lifecycle_event
    delete process.env.npm_lifecycle_event
    try {
      expect(() => resolveAuthOptions(auth, { client: false, mode: 'embedded' }, [], appDir)).toThrow(/no service schemas were detected/i)
    }
    finally {
      if (previous == null)
        delete process.env.npm_lifecycle_event
      else
        process.env.npm_lifecycle_event = previous
    }
  })


  it('preserves explicit authStrategies without reintroducing local defaults', () => {
    const auth = {
      authStrategies: ['jwt'] as AuthStrategies,
      local: {
        usernameField: 'userId',
      },
    }

    const result = resolveAuthOptions(auth, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result).toMatchObject({
      authStrategies: ['jwt'],
    })
    expect((result as any)?.local).toBeUndefined()
  })


  it('preserves explicit authStrategies without reintroducing jwt defaults', () => {
    const auth = {
      authStrategies: ['local'] as AuthStrategies,
      jwtOptions: {
        secret,
      },
    }

    const result = resolveAuthOptions(auth, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result).toMatchObject({
      authStrategies: ['local'],
    })
    expect((result as any)?.jwtOptions).toBeUndefined()
  })

  it('defaults local auth fields to userId/password for the current generated auth baseline', () => {
    expect(authLocalDefaults).toMatchObject({
      usernameField: 'userId',
      passwordField: 'password',
      entityUsernameField: 'userId',
      entityPasswordField: 'password',
    })
  })

})
