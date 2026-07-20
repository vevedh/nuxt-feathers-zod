import { Buffer } from 'node:buffer'
import { generateKeyPairSync } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveNfzJwtKeys } from './security'

const authenticationEnvironmentKeys = [
  'NODE_ENV',
  'NFZ_AUTH_SECRET',
  'AUTH_SECRET',
  'NUXT_FEATHERS_AUTH_SECRET',
  'NFZ_AUTH_PRIVATE_KEY',
  'NUXT_FEATHERS_AUTH_PRIVATE_KEY',
  'NFZ_AUTH_PUBLIC_KEY',
  'NUXT_FEATHERS_AUTH_PUBLIC_KEY',
  'NFZ_AUTH_ALGORITHM',
  'NFZ_AUTH_KEY_ID',
] as const

const originalEnvironment = Object.fromEntries(
  authenticationEnvironmentKeys.map(key => [key, process.env[key]]),
)

function clearAuthenticationEnvironment(): void {
  for (const key of authenticationEnvironmentKeys)
    delete process.env[key]
}

function createRsaKeyPair(): { privateKey: string, publicKey: string } {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
  return {
    privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  }
}

beforeEach(() => {
  clearAuthenticationEnvironment()
})

afterEach(() => {
  clearAuthenticationEnvironment()
  for (const key of authenticationEnvironmentKeys) {
    const value = originalEnvironment[key]
    if (value !== undefined)
      process.env[key] = value
  }
  vi.restoreAllMocks()
})

describe('authentication key security', () => {
  it('creates an ephemeral development key instead of a deterministic project hash', () => {
    process.env.NODE_ENV = 'test'
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = resolveNfzJwtKeys()
    const second = resolveNfzJwtKeys()
    expect(first.source).toBe('ephemeral-development')
    expect(first.signingKey).not.toBe(second.signingKey)
    expect(Buffer.byteLength(first.signingKey)).toBeGreaterThanOrEqual(48)
  })

  it('refuses production startup without explicit key material', () => {
    process.env.NODE_ENV = 'production'
    expect(() => resolveNfzJwtKeys()).toThrow(/refusing to start/i)
  })

  it('refuses weak production secrets', () => {
    process.env.NODE_ENV = 'production'
    expect(() => resolveNfzJwtKeys({ secret: 'change-me' })).toThrow(/at least 32/i)
  })

  it('refuses asymmetric algorithms with symmetric key material', () => {
    process.env.NODE_ENV = 'production'
    expect(() => resolveNfzJwtKeys({
      secret: 'a-production-secret-that-is-longer-than-32-bytes',
      algorithm: 'RS256',
    })).toThrow(/requires asymmetric key material/i)
  })

  it('supports a matching RSA signing and verification key pair', () => {
    process.env.NODE_ENV = 'production'
    const pair = createRsaKeyPair()
    const keys = resolveNfzJwtKeys({
      mode: 'asymmetric',
      algorithm: 'RS256',
      ...pair,
      keyId: 'primary-2026',
    })
    expect(keys).toMatchObject({
      mode: 'asymmetric',
      algorithm: 'RS256',
      keyId: 'primary-2026',
      source: 'configuration',
    })
    expect(keys.signingKey).toContain('BEGIN PRIVATE KEY')
    expect(keys.verificationKey).toContain('BEGIN PUBLIC KEY')
  })

  it('refuses mismatched asymmetric key pairs', () => {
    process.env.NODE_ENV = 'production'
    const first = createRsaKeyPair()
    const second = createRsaKeyPair()
    expect(() => resolveNfzJwtKeys({
      mode: 'asymmetric',
      algorithm: 'RS256',
      privateKey: first.privateKey,
      publicKey: second.publicKey,
    })).toThrow(/does not match/i)
  })

  it('refuses RSA keys smaller than 2048 bits', () => {
    process.env.NODE_ENV = 'production'
    const pair = generateKeyPairSync('rsa', { modulusLength: 1024 })
    expect(() => resolveNfzJwtKeys({
      mode: 'asymmetric',
      algorithm: 'RS256',
      privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    })).toThrow(/at least 2048 bits/i)
  })

  it('refuses a key type incompatible with the selected algorithm', () => {
    process.env.NODE_ENV = 'production'
    const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    expect(() => resolveNfzJwtKeys({
      mode: 'asymmetric',
      algorithm: 'RS256',
      privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
      publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    })).toThrow(/requires an RSA key pair/i)
  })
})
