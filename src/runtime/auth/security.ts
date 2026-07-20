import { Buffer } from 'node:buffer'
import { createPrivateKey, createPublicKey, randomBytes } from 'node:crypto'

export type NfzJwtKeyMode = 'symmetric' | 'asymmetric'

export interface NfzJwtKeyOptions {
  mode?: NfzJwtKeyMode
  algorithm?: string
  secret?: string
  privateKey?: string
  publicKey?: string
  keyId?: string
}

export interface NfzResolvedJwtKeys {
  mode: NfzJwtKeyMode
  algorithm: string
  signingKey: string
  verificationKey: string
  keyId?: string
  source: 'configuration' | 'environment' | 'ephemeral-development'
}

const knownUnsafeSecrets = new Set([
  'change-me',
  'change-me-in-production',
  'changeme',
  'secret',
  'admin123',
  'password',
  'your-secret',
])

const symmetricAlgorithms = new Set(['HS256', 'HS384', 'HS512'])
const rsaAlgorithms = new Set(['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512'])
const ellipticCurveAlgorithms = new Set(['ES256', 'ES384', 'ES512'])
const asymmetricAlgorithms = new Set([...rsaAlgorithms, ...ellipticCurveAlgorithms])
const supportedAlgorithms = new Set([...symmetricAlgorithms, ...asymmetricAlgorithms])

let warnedEphemeralSecret = false

function normalizeAlgorithm(value: string | undefined, fallback: string): string {
  const algorithm = value?.trim() || fallback
  if (!supportedAlgorithms.has(algorithm)) {
    throw new Error(
      `[nuxt-feathers-zod] Unsupported JWT algorithm '${algorithm}'. `
      + `Supported algorithms: ${[...supportedAlgorithms].join(', ')}.`,
    )
  }
  return algorithm
}

function assertAlgorithmMatchesMode(mode: NfzJwtKeyMode, algorithm: string): void {
  const symmetric = symmetricAlgorithms.has(algorithm)
  if (mode === 'symmetric' && !symmetric) {
    throw new Error(`[nuxt-feathers-zod] JWT algorithm '${algorithm}' requires asymmetric key material.`)
  }
  if (mode === 'asymmetric' && symmetric) {
    throw new Error(`[nuxt-feathers-zod] JWT algorithm '${algorithm}' cannot be used with asymmetric key material.`)
  }
}

function assertKeyTypeMatchesAlgorithm(
  algorithm: string,
  asymmetricKeyType: string | undefined,
  details: Record<string, unknown> | undefined,
): void {
  if (rsaAlgorithms.has(algorithm)) {
    if (asymmetricKeyType !== 'rsa' && asymmetricKeyType !== 'rsa-pss') {
      throw new Error(
        [
          `[nuxt-feathers-zod] JWT algorithm '${algorithm}' requires an RSA key pair,`,
          `received '${asymmetricKeyType || 'unknown'}'.`,
        ].join(' '),
      )
    }
    const modulusLength = typeof details?.modulusLength === 'number' ? details.modulusLength : undefined
    if (modulusLength !== undefined && modulusLength < 2048)
      throw new Error('[nuxt-feathers-zod] RSA JWT keys must use a modulus length of at least 2048 bits.')
  }

  if (ellipticCurveAlgorithms.has(algorithm)) {
    if (asymmetricKeyType !== 'ec') {
      throw new Error(
        [
          `[nuxt-feathers-zod] JWT algorithm '${algorithm}' requires an EC key pair,`,
          `received '${asymmetricKeyType || 'unknown'}'.`,
        ].join(' '),
      )
    }
    const requiredCurve = {
      ES256: 'prime256v1',
      ES384: 'secp384r1',
      ES512: 'secp521r1',
    }[algorithm]
    const namedCurve = typeof details?.namedCurve === 'string' ? details.namedCurve : undefined
    if (requiredCurve && namedCurve && namedCurve !== requiredCurve) {
      throw new Error(
        `[nuxt-feathers-zod] JWT algorithm '${algorithm}' requires curve '${requiredCurve}', received '${namedCurve}'.`,
      )
    }
  }
}

function validateAsymmetricKeyPair(privatePem: string, publicPem: string, algorithm: string): void {
  try {
    const privateKey = createPrivateKey(privatePem)
    const publicKey = createPublicKey(publicPem)
    assertKeyTypeMatchesAlgorithm(
      algorithm,
      privateKey.asymmetricKeyType,
      privateKey.asymmetricKeyDetails as Record<string, unknown> | undefined,
    )
    assertKeyTypeMatchesAlgorithm(
      algorithm,
      publicKey.asymmetricKeyType,
      publicKey.asymmetricKeyDetails as Record<string, unknown> | undefined,
    )

    const derivedPublic = createPublicKey(privateKey).export({ type: 'spki', format: 'der' })
    const configuredPublic = publicKey.export({ type: 'spki', format: 'der' })
    if (!derivedPublic.equals(configuredPublic))
      throw new Error('public key does not match the private key')
  }
  catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`[nuxt-feathers-zod] Invalid asymmetric JWT key pair: ${detail}`)
  }
}

function readFirstEnvironmentValue(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]
    if (typeof value === 'string' && value.trim())
      return value
  }
  return undefined
}

function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function assertStrongSymmetricSecret(secret: string, production: boolean): void {
  const normalized = secret.trim()
  const byteLength = Buffer.byteLength(secret, 'utf8')
  const unsafe = knownUnsafeSecrets.has(normalized.toLowerCase())

  if (unsafe || byteLength < 32) {
    const message = '[nuxt-feathers-zod] Authentication secret must contain at least 32 UTF-8 bytes '
      + 'and must not use a known demo/default value.'
    if (production)
      throw new Error(message)
    console.warn(message)
  }
}

export function resolveNfzJwtKeys(options: NfzJwtKeyOptions = {}): NfzResolvedJwtKeys {
  const production = isProduction()
  const configuredMode = options.mode
  const configuredAlgorithm = options.algorithm || readFirstEnvironmentValue(['NFZ_AUTH_ALGORITHM'])
  const privateKey = options.privateKey || readFirstEnvironmentValue([
    'NUXT_FEATHERS_AUTH_PRIVATE_KEY',
    'NFZ_AUTH_PRIVATE_KEY',
  ])
  const publicKey = options.publicKey || readFirstEnvironmentValue([
    'NUXT_FEATHERS_AUTH_PUBLIC_KEY',
    'NFZ_AUTH_PUBLIC_KEY',
  ])

  if (configuredMode === 'asymmetric' && options.secret) {
    throw new Error('[nuxt-feathers-zod] JWT key mode is asymmetric but a symmetric secret was also provided.')
  }

  if (configuredMode === 'symmetric' && (privateKey || publicKey)) {
    throw new Error(
      '[nuxt-feathers-zod] JWT key mode is symmetric but asymmetric private/public key material was also provided.',
    )
  }

  const asymmetric = configuredMode === 'asymmetric' || Boolean(privateKey || publicKey)

  if (asymmetric) {
    if (!privateKey || !publicKey) {
      throw new Error(
        '[nuxt-feathers-zod] Asymmetric JWT mode requires both a private signing key and a public verification key. '
        + 'Use NFZ_AUTH_PRIVATE_KEY and NFZ_AUTH_PUBLIC_KEY (or their NUXT_FEATHERS_* equivalents).',
      )
    }

    const algorithm = normalizeAlgorithm(configuredAlgorithm, 'RS256')
    const signingKey = normalizePem(privateKey)
    const verificationKey = normalizePem(publicKey)
    assertAlgorithmMatchesMode('asymmetric', algorithm)
    validateAsymmetricKeyPair(signingKey, verificationKey, algorithm)

    return {
      mode: 'asymmetric',
      algorithm,
      signingKey,
      verificationKey,
      keyId: options.keyId || readFirstEnvironmentValue(['NFZ_AUTH_KEY_ID']),
      source: options.privateKey || options.publicKey ? 'configuration' : 'environment',
    }
  }

  const configuredSecret = options.secret
  const environmentSecret = readFirstEnvironmentValue([
    'NUXT_FEATHERS_AUTH_SECRET',
    'NFZ_AUTH_SECRET',
    'AUTH_SECRET',
  ])
  const secret = configuredSecret || environmentSecret
  const algorithm = normalizeAlgorithm(configuredAlgorithm, 'HS256')
  assertAlgorithmMatchesMode('symmetric', algorithm)

  if (!secret) {
    if (production) {
      throw new Error(
        '[nuxt-feathers-zod] Refusing to start embedded authentication in production without a secret. '
        + 'Set NFZ_AUTH_SECRET (minimum 32 bytes) or configure asymmetric JWT keys.',
      )
    }

    const ephemeral = randomBytes(48).toString('base64url')
    if (!warnedEphemeralSecret) {
      warnedEphemeralSecret = true
      console.warn(
        '[nuxt-feathers-zod] No authentication secret was configured. '
        + 'An ephemeral development-only secret was generated; sessions will be invalidated on restart.',
      )
    }

    return {
      mode: 'symmetric',
      algorithm,
      signingKey: ephemeral,
      verificationKey: ephemeral,
      keyId: options.keyId || readFirstEnvironmentValue(['NFZ_AUTH_KEY_ID']),
      source: 'ephemeral-development',
    }
  }

  assertStrongSymmetricSecret(secret, production)

  return {
    mode: 'symmetric',
    algorithm,
    signingKey: secret,
    verificationKey: secret,
    keyId: options.keyId || readFirstEnvironmentValue(['NFZ_AUTH_KEY_ID']),
    source: configuredSecret ? 'configuration' : 'environment',
  }
}
