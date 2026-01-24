import type { AuthStrategies } from '.'
import { describe, expect, it } from 'vitest'
import { getAuthClientDefaults, resolveAuthClientOptions } from './client'
import { authClientJwtDefaults } from './jwt'

describe('getAuthClientDefaults', () => {
  it('should return empty object if jwt is not included in authStrategies', () => {
    const authStrategies: AuthStrategies = ['local']

    const result = getAuthClientDefaults(authStrategies)

    expect(result).toEqual({})
  })

  it('should return jwt defaults if jwt is included in authStrategies', () => {
    const authStrategies: AuthStrategies = ['jwt']

    const result = getAuthClientDefaults(authStrategies)

    expect(result).toEqual(authClientJwtDefaults)
  })
})

describe('resolveAuthClientOptions', () => {
  it('should return default auth client options if authClient is undefined', () => {
    const authStrategies: AuthStrategies = ['jwt']

    const result = resolveAuthClientOptions(undefined, authStrategies)

    expect(result).toEqual(authClientJwtDefaults)
  })

  it('should merge authClient with default auth client options', () => {
    const authStrategies: AuthStrategies = ['jwt']
    const authClient = { header: 'Custom-Header' }

    const result = resolveAuthClientOptions(authClient, authStrategies)

    expect(result).toEqual({
      ...authClientJwtDefaults,
      header: 'Custom-Header',
    })
  })
})
