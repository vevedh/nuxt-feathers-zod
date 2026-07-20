import type { IncomingMessage } from 'node:http'
import { Buffer } from 'node:buffer'
import { afterEach, describe, expect, it } from 'vitest'
import { NfzOidcStrategy } from './oidc'

const originalNodeEnv = process.env.NODE_ENV

function encodePart(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function unsignedJwt(payload: Record<string, unknown>): string {
  return `${encodePart({ alg: 'RS256', typ: 'JWT' })}.${encodePart(payload)}.signature`
}

function createStrategy(configuration: Record<string, unknown>): NfzOidcStrategy {
  const strategy = new NfzOidcStrategy()
  strategy.setName('enterprise')
  strategy.setApplication({} as any)
  strategy.setAuthentication({
    configuration: {
      entity: null,
      enterprise: {
        type: 'oidc',
        issuer: 'https://identity.example.test/realms/main',
        audience: 'nfz-api',
        ...configuration,
      },
    },
  } as any)
  return strategy
}

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
})

describe('nfz OIDC strategy', () => {
  it('parses only bearer tokens matching both issuer and audience', async () => {
    process.env.NODE_ENV = 'test'
    const strategy = createStrategy({})
    strategy.verifyConfiguration()
    const token = unsignedJwt({
      iss: 'https://identity.example.test/realms/main/',
      aud: ['account', 'nfz-api'],
      sub: 'anonymous-subject',
    })
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as IncomingMessage

    await expect(strategy.parse(request)).resolves.toEqual({
      strategy: 'enterprise',
      accessToken: token,
    })
  })

  it('ignores bearer tokens issued for a different audience', async () => {
    const strategy = createStrategy({})
    const token = unsignedJwt({
      iss: 'https://identity.example.test/realms/main',
      aud: 'another-api',
      sub: 'anonymous-subject',
    })
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as IncomingMessage

    await expect(strategy.parse(request)).resolves.toBeNull()
  })

  it('forbids fail-open identity mapping in production', () => {
    process.env.NODE_ENV = 'production'
    const strategy = createStrategy({ failOpen: true })
    expect(() => strategy.verifyConfiguration()).toThrow(/failOpen is forbidden/i)
  })

  it('forbids symmetric algorithms for remote JWKS verification', () => {
    const strategy = createStrategy({ algorithms: ['HS256'] })
    expect(() => strategy.verifyConfiguration()).toThrow(/not allowed for remote JWKS/i)
  })

  it('allows plain HTTP only for local development issuers', () => {
    process.env.NODE_ENV = 'test'
    expect(() => createStrategy({ issuer: 'http://localhost:8080/realms/main' }).verifyConfiguration()).not.toThrow()
    expect(
      () => createStrategy({ issuer: 'http://identity.example.test/realms/main' }).verifyConfiguration(),
    ).toThrow(/must use HTTPS/i)
  })
})
