import { describe, expect, it } from 'vitest'
import { buildLocalAuthPayload, getAccessTokenFromResult } from './auth'
import { getForcedAuthProvider, getPublicClientMode, getPublicLocalAuthPasswordField, getPublicLocalAuthUsernameField, getPublicRemoteAuthConfig, hasPublicKeycloakConfig, isPublicRemoteAuthEnabled } from './config'

describe('runtime public config helpers', () => {
  it('defaults client mode to embedded', () => {
    expect(getPublicClientMode(undefined as any)).toBe('embedded')
    expect(getPublicClientMode({} as any)).toBe('embedded')
  })

  it('reads remote mode and auth settings safely', () => {
    const pub = {
      _feathers: {
        client: {
          mode: 'remote',
          remote: {
            auth: {
              enabled: true,
              payloadMode: 'keycloak',
            },
          },
        },
      },
    } as any

    expect(getPublicClientMode(pub)).toBe('remote')
    expect(isPublicRemoteAuthEnabled(pub)).toBe(true)
    expect(getPublicRemoteAuthConfig(pub).payloadMode).toBe('keycloak')
  })

  it('detects keycloak presence and forced provider', () => {
    const pub = { FEATHERS_AUTH_PROVIDER: 'Keycloak', _feathers: { keycloak: { realm: 'demo' } } } as any
    expect(getForcedAuthProvider(pub)).toBe('keycloak')
    expect(hasPublicKeycloakConfig(pub)).toBe(true)
  })

  it('exposes embedded local auth field helpers safely', () => {
    const pub = {
      _feathers: {
        auth: {
          local: {
            usernameField: 'userId',
            passwordField: 'password',
          },
        },
      },
    } as any

    expect(getPublicLocalAuthUsernameField(pub)).toBe('userId')
    expect(getPublicLocalAuthPasswordField(pub)).toBe('password')
    expect(getPublicLocalAuthUsernameField(undefined as any)).toBe('userId')
    expect(getPublicLocalAuthPasswordField(undefined as any)).toBe('password')
  })
})

describe('auth utils', () => {
  it('reads access token aliases from direct and nested results', () => {
    expect(getAccessTokenFromResult({ accessToken: 'a' })).toBe('a')
    expect(getAccessTokenFromResult({ access_token: 'b' })).toBe('b')
    expect(getAccessTokenFromResult({ token: 'c' })).toBe('c')
    expect(getAccessTokenFromResult({ authentication: { accessToken: 'd' } })).toBe('d')
    expect(getAccessTokenFromResult({ authentication: { access_token: 'e' } })).toBe('e')
    expect(getAccessTokenFromResult({ authentication: { token: 'f' } })).toBe('f')
  })

  it('builds local auth payloads from runtime field metadata', () => {
    expect(buildLocalAuthPayload('demo', 'secret', { usernameField: 'userId', passwordField: 'password' })).toEqual({
      strategy: 'local',
      userId: 'demo',
      password: 'secret',
    })
    expect(buildLocalAuthPayload('demo@example.local', 'secret', { usernameField: 'email', passwordField: 'password' })).toEqual({
      strategy: 'local',
      email: 'demo@example.local',
      password: 'secret',
    })
  })
})
