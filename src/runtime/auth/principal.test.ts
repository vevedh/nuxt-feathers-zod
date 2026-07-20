import { describe, expect, it } from 'vitest'
import { createNfzPrincipal, toNfzPrincipalJwtClaims } from './principal'

describe('nfz principal normalization', () => {
  it('normalizes local and OIDC claims without duplicates', () => {
    const principal = createNfzPrincipal({
      provider: 'enterprise',
      user: {
        id: 'user-001',
        username: 'member',
        roles: ['reader', 'reader'],
      },
      payload: {
        sub: 'oidc-subject',
        tenant_id: 'tenant-a',
        scope: 'openid profile reports.read',
        realm_access: { roles: ['reader', 'manager'] },
        resource_access: { web: { roles: ['operator'] } },
        amr: ['pwd', 'otp'],
      },
      claims: { clientId: 'web' },
      defaultAssuranceLevel: 'aal2',
    })

    expect(principal).toMatchObject({
      subject: 'oidc-subject',
      provider: 'enterprise',
      tenantId: 'tenant-a',
      username: 'member',
      roles: ['reader', 'manager', 'operator'],
      scopes: ['openid', 'profile', 'reports.read'],
      authenticationMethods: ['pwd', 'otp', 'enterprise'],
      assuranceLevel: 'aal2',
    })
  })

  it('restores the original provider from NFZ JWT claims', () => {
    const principal = createNfzPrincipal({
      provider: 'jwt',
      user: { id: 'user-002' },
      payload: {
        sub: 'user-002',
        nfz: {
          provider: 'local',
          roles: ['admin'],
          assuranceLevel: 'aal1',
        },
      },
    })

    expect(principal?.provider).toBe('local')
    expect(principal?.roles).toEqual(['admin'])
    expect(principal && toNfzPrincipalJwtClaims(principal)).not.toHaveProperty('email')
  })

  it('returns null when no stable subject can be derived', () => {
    expect(createNfzPrincipal({ provider: 'custom', payload: {} })).toBeNull()
  })
})
