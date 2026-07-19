import type { Import } from 'unimport'
import type { AuthStrategies } from './index'
import { createResolver } from '@nuxt/kit'
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

  it('resolves legacy defaults through the provider registry', () => {
    const result = resolveAuthOptions(true, { client: true, mode: 'embedded' }, servicesImports, appDir)
    expect(result).toEqual({
      ...getAuthDefaults(appDir),
      entityImport: UserImport,
      client: getAuthClientDefaults(['local', 'jwt']),
    })
    expect(result && result.providers).toMatchObject({
      local: { type: 'local', parse: false },
      jwt: { type: 'jwt', parse: true },
    })
    expect(result && result.parseStrategies).toEqual(['jwt'])
    expect(result && result.secret).toBeUndefined()
  })

  it('resolves auth defaults without client when client is disabled', () => {
    const result = resolveAuthOptions(true, { client: false, mode: 'embedded' }, servicesImports, appDir)
    expect(result).toEqual({
      ...getAuthDefaults(appDir),
      entityImport: UserImport,
    })
  })

  it('preserves legacy local-only configuration', () => {
    const authStrategies: AuthStrategies = ['local']
    const result = resolveAuthOptions({ authStrategies }, { client: false, mode: 'embedded' }, servicesImports, appDir)
    expect(result).toMatchObject({
      authStrategies,
      parseStrategies: [],
      local: authLocalDefaults,
      providers: { local: { type: 'local' } },
    })
  })

  it('preserves legacy jwt-only configuration', () => {
    const authStrategies: AuthStrategies = ['jwt']
    const result = resolveAuthOptions({ authStrategies }, { client: false, mode: 'embedded' }, servicesImports, appDir)
    expect(result).toMatchObject({
      authStrategies,
      parseStrategies: ['jwt'],
      jwtOptions: authJwtDefaults,
      providers: { jwt: { type: 'jwt' } },
    })
  })

  it('derives enabled strategies from declarative providers', () => {
    const result = resolveAuthOptions({
      providers: {
        enterprise: {
          type: 'oidc',
          issuer: 'https://identity.example.test/realms/main',
          audience: 'web',
        },
        automation: {
          type: 'api-key',
          keys: [],
          issueAccessToken: false,
        },
      },
    }, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result && result.authStrategies).toEqual(['enterprise', 'automation', 'jwt'])
    expect(result && result.parseStrategies).toEqual(['enterprise', 'automation', 'jwt'])
    expect(result && result.jwtOptions).toEqual(authJwtDefaults)
    expect(result && result.local).toBeUndefined()
  })

  it('does not add a JWT verifier for an API-key-only provider that does not issue NFZ tokens', () => {
    const result = resolveAuthOptions({
      providers: {
        automation: {
          type: 'api-key',
          keys: [],
          issueAccessToken: false,
        },
      },
    }, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result && result.authStrategies).toEqual(['automation'])
    expect(result && result.parseStrategies).toEqual(['automation'])
    expect(result && result.jwtOptions).toBeUndefined()
  })

  it('keeps external providers before jwt in parse order', () => {
    const result = resolveAuthOptions({
      providers: {
        jwt: { type: 'jwt' },
        enterprise: {
          type: 'oidc',
          issuer: 'https://identity.example.test',
          audience: 'web',
        },
      },
    }, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result && result.parseStrategies).toEqual(['enterprise', 'jwt'])
  })

  it('resolves false if auth is disabled', () => {
    expect(resolveAuthOptions(false, { client: false, mode: 'embedded' }, servicesImports, appDir)).toEqual(false)
  })

  it('degrades to false during prepare when embedded auth has no detected services', () => {
    const previous = process.env.npm_lifecycle_event
    process.env.npm_lifecycle_event = 'postinstall'
    try {
      expect(resolveAuthOptions(true, { client: false, mode: 'embedded' }, [], appDir)).toEqual(false)
    }
    finally {
      if (previous == null)
        delete process.env.npm_lifecycle_event
      else
        process.env.npm_lifecycle_event = previous
    }
  })

  it('stays strict outside prepare when embedded auth has no detected services', () => {
    const previous = process.env.npm_lifecycle_event
    delete process.env.npm_lifecycle_event
    try {
      expect(() => resolveAuthOptions(true, { client: false, mode: 'embedded' }, [], appDir)).toThrow(/no service schemas were detected/i)
    }
    finally {
      if (previous == null)
        delete process.env.npm_lifecycle_event
      else
        process.env.npm_lifecycle_event = previous
    }
  })

  it('does not reintroduce local defaults when jwt is explicit', () => {
    const result = resolveAuthOptions({
      authStrategies: ['jwt'],
      local: { usernameField: 'userId' },
    }, { client: false, mode: 'embedded' }, servicesImports, appDir)

    expect(result).toMatchObject({ authStrategies: ['jwt'] })
    expect(result && result.local).toBeUndefined()
  })

  it('defaults local fields to userId/password', () => {
    expect(authLocalDefaults).toMatchObject({
      usernameField: 'userId',
      passwordField: 'password',
      entityUsernameField: 'userId',
      entityPasswordField: 'password',
    })
  })
})
