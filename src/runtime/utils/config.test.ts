import { describe, expect, it } from 'vitest'
import { getForcedAuthProvider, getPublicClientMode, getPublicRemoteAuthConfig, hasPublicKeycloakConfig, isPublicRemoteAuthEnabled } from './config'

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
})
