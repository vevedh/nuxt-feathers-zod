import { describe, expect, it } from 'vitest'
import { looksLikeMissingAccessTokenError, shouldTreatReauthAsAnonymous } from '../src/runtime/utils/auth-runtime'

describe('auth runtime anonymous reauth handling', () => {
  it('detects the startup no-token error emitted by Feathers auth client', () => {
    expect(looksLikeMissingAccessTokenError({
      name: 'NotAuthenticated',
      className: 'not-authenticated',
      code: 401,
      message: 'No accessToken found in storage',
    })).toBe(true)
  })

  it('treats reauth as anonymous when no token is available', () => {
    expect(shouldTreatReauthAsAnonymous({
      name: 'NotAuthenticated',
      className: 'not-authenticated',
      code: 401,
      message: 'No accessToken found in storage',
    }, null)).toBe(true)
  })

  it('keeps real token-backed failures as errors', () => {
    expect(shouldTreatReauthAsAnonymous({
      name: 'NotAuthenticated',
      className: 'not-authenticated',
      code: 401,
      message: 'JWT expired',
    }, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(false)
  })
})
