import type { AuthenticationParams, AuthenticationRequest, AuthenticationResult } from '@feathersjs/authentication'
import type { IncomingMessage } from 'node:http'
import type { NfzApiKeyProviderOptions, NfzApiKeyRecord } from '../types'
import { Buffer } from 'node:buffer'
import { createHash, timingSafeEqual } from 'node:crypto'
import { AuthenticationBaseStrategy } from '@feathersjs/authentication'
import { NotAuthenticated } from '@feathersjs/errors'
import { createNfzPrincipal } from '../principal'

function getHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers?.[name.toLowerCase()]
  return typeof value === 'string' ? value : undefined
}

function parseApiKeyHeader(value: string, schemes: string[]): string | null {
  const parts = value.trim().split(/\s/u).filter(Boolean)
  if (parts.length <= 1)
    return parts[0] || null

  const [scheme, ...credentialParts] = parts
  const accepted = schemes.some(item => item.toLowerCase() === scheme.toLowerCase())
  return accepted ? credentialParts.join(' ') : null
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function hashNfzApiKey(secret: string, pepper = ''): string {
  if (typeof secret !== 'string' || secret.length < 24)
    throw new Error('[nuxt-feathers-zod] API keys must contain at least 24 characters of entropy.')
  return createHash('sha256').update(`${pepper}\u0000${secret}`, 'utf8').digest('base64url')
}

function splitCredential(value: string): { id?: string, secret: string } {
  const separator = value.indexOf('.')
  if (separator <= 0)
    return { secret: value }
  return {
    id: value.slice(0, separator),
    secret: value.slice(separator + 1),
  }
}

function isActive(record: NfzApiKeyRecord): boolean {
  if (record.revoked)
    return false
  if (!record.expiresAt)
    return true
  const expiresAt = Date.parse(record.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

export class NfzApiKeyStrategy extends AuthenticationBaseStrategy {
  get configuration(): NfzApiKeyProviderOptions {
    return super.configuration as NfzApiKeyProviderOptions
  }

  verifyConfiguration(): void {
    const config = this.configuration
    if (!Array.isArray(config.keys))
      throw new Error(`[nuxt-feathers-zod] API key strategy '${this.name}' requires a keys array.`)

    const ids = new Set<string>()
    for (const record of config.keys) {
      if (!record.id || !record.hash || !record.subject)
        throw new Error(`[nuxt-feathers-zod] API key strategy '${this.name}' contains an incomplete key record.`)
      if (!/^[\w-]{43}$/.test(record.hash)) {
        throw new Error(
          `[nuxt-feathers-zod] API key '${record.id}' must store a SHA-256 base64url hash, never the raw secret.`,
        )
      }
      if (ids.has(record.id))
        throw new Error(`[nuxt-feathers-zod] API key strategy '${this.name}' contains duplicate id '${record.id}'.`)
      ids.add(record.id)
    }
  }

  async authenticate(authentication: AuthenticationRequest, _params: AuthenticationParams): Promise<AuthenticationResult> {
    const credential = typeof authentication.apiKey === 'string'
      ? authentication.apiKey
      : typeof authentication.accessToken === 'string'
        ? authentication.accessToken
        : undefined

    if (!credential)
      throw new NotAuthenticated('[nuxt-feathers-zod] API key is required.')

    const config = this.configuration
    const { id, secret } = splitCredential(credential)
    const candidates = id ? config.keys.filter(record => record.id === id) : config.keys
    const computedHash = hashNfzApiKey(secret, config.pepper || '')
    const record = candidates.find(candidate => isActive(candidate) && safeEqual(candidate.hash, computedHash))

    if (!record)
      throw new NotAuthenticated('[nuxt-feathers-zod] Invalid or expired API key.')

    const principal = createNfzPrincipal({
      provider: this.name || 'api-key',
      principal: record,
      defaultAssuranceLevel: record.assuranceLevel || config.assuranceLevel || 'aal2',
    })

    if (!principal)
      throw new NotAuthenticated('[nuxt-feathers-zod] API key principal could not be normalized.')

    const entityKey = this.authentication?.configuration.entity
    const entity = record.entity || {
      id: record.subject,
      roles: record.roles || [],
      permissions: record.permissions || [],
      scopes: record.scopes || [],
      tenantId: record.tenantId,
      organizationId: record.organizationId,
      username: record.username,
    }

    return {
      principal,
      authentication: {
        strategy: this.name || 'api-key',
        keyId: record.id,
      },
      ...(entityKey ? { [entityKey]: entity } : {}),
    }
  }

  async parse(req: IncomingMessage): Promise<AuthenticationRequest | null> {
    const config = this.configuration
    const raw = getHeader(req, config.header || 'x-api-key')
    if (!raw)
      return null

    const apiKey = parseApiKeyHeader(raw, config.schemes || ['ApiKey'])
    return apiKey ? { strategy: this.name || 'api-key', apiKey } : null
  }
}
