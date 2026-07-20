import { describe, expect, it } from 'vitest'
import { hashNfzApiKey, NfzApiKeyStrategy } from './api-key'

function createStrategy(secret: string) {
  const strategy = new NfzApiKeyStrategy()
  strategy.setName('automation')
  strategy.setApplication({} as any)
  strategy.setAuthentication({
    configuration: {
      entity: 'user',
      automation: {
        type: 'api-key',
        keys: [{
          id: 'build',
          hash: hashNfzApiKey(secret, 'pepper'),
          subject: 'service-build',
          scopes: ['deploy'],
          roles: ['automation'],
        }],
        pepper: 'pepper',
      },
    },
  } as any)
  return strategy
}

describe('nfz API key strategy', () => {
  it('authenticates a high-entropy id.secret credential without returning the raw key', async () => {
    const secret = 'nFz_2026_very_long_random_api_key_material'
    const result = await createStrategy(secret).authenticate({
      strategy: 'automation',
      apiKey: `build.${secret}`,
    }, {})

    expect(result.principal).toMatchObject({
      subject: 'service-build',
      provider: 'automation',
      scopes: ['deploy'],
      roles: ['automation'],
    })
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  it('rejects an invalid key', async () => {
    await expect(createStrategy('nFz_2026_very_long_random_api_key_material').authenticate({
      strategy: 'automation',
      apiKey: 'build.nFz_2026_invalid_random_api_key_material',
    }, {})).rejects.toThrow(/invalid or expired/i)
  })

  it('rejects low-entropy provisioning material', () => {
    expect(() => hashNfzApiKey('too-short')).toThrow(/24 characters/i)
  })
})
