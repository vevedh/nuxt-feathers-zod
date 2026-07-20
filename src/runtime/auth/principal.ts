export type NfzAuthenticationAssuranceLevel = 'aal1' | 'aal2' | 'aal3'

export interface NfzPrincipal {
  subject: string
  provider: string
  tenantId?: string
  organizationId?: string
  sessionId?: string
  username?: string
  email?: string
  roles: string[]
  permissions: string[]
  scopes: string[]
  authenticationMethods: string[]
  assuranceLevel: NfzAuthenticationAssuranceLevel
  issuedAt?: number
  expiresAt?: number
}

export interface NfzPrincipalClaimsOptions {
  subject?: string
  tenant?: string
  organization?: string
  username?: string
  email?: string
  roles?: string
  permissions?: string
  scopes?: string
  session?: string
  authenticationMethods?: string
  assuranceLevel?: string
  clientId?: string
}

export interface CreateNfzPrincipalOptions {
  provider: string
  user?: unknown
  payload?: unknown
  principal?: unknown
  claims?: NfzPrincipalClaimsOptions
  defaultAssuranceLevel?: NfzAuthenticationAssuranceLevel
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getPath(source: unknown, path: string | undefined): unknown {
  if (!path || !isRecord(source))
    return undefined

  return path.split('.').reduce<unknown>((value, segment) => {
    return isRecord(value) ? value[segment] : undefined
  }, source)
}

function firstDefined(...values: unknown[]): unknown {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function toStringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim())
    return value.trim()
  if (typeof value === 'number' || typeof value === 'bigint')
    return String(value)
  if (value && typeof value === 'object' && typeof (value as { toString?: unknown }).toString === 'function') {
    const stringValue = String(value)
    if (stringValue && stringValue !== '[object Object]')
      return stringValue
  }
  return undefined
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return [...new Set(value.map(toStringValue).filter((item): item is string => Boolean(item)))]

  if (typeof value === 'string') {
    return [...new Set(value.split(/[\s,]+/).map(item => item.trim()).filter(Boolean))]
  }

  return []
}

function mergeStringArrays(...values: unknown[]): string[] {
  return [...new Set(values.flatMap(toStringArray))]
}

function normalizeAssuranceLevel(
  value: unknown,
  fallback: NfzAuthenticationAssuranceLevel,
): NfzAuthenticationAssuranceLevel {
  return value === 'aal1' || value === 'aal2' || value === 'aal3' ? value : fallback
}

function numericDate(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function createNfzPrincipal(options: CreateNfzPrincipalOptions): NfzPrincipal | null {
  const user = isRecord(options.user) ? options.user : {}
  const payload = isRecord(options.payload) ? options.payload : {}
  const explicit = isRecord(options.principal) ? options.principal : {}
  const embedded = isRecord(payload.nfz) ? payload.nfz : {}
  const claims = options.claims ?? {}

  const subject = toStringValue(firstDefined(
    explicit.subject,
    embedded.subject,
    getPath(payload, claims.subject),
    payload.sub,
    user.id,
    user._id,
    user.userId,
    user.sub,
  ))

  if (!subject)
    return null

  const provider = toStringValue(firstDefined(explicit.provider, embedded.provider, options.provider)) || options.provider
  const clientId = claims.clientId
  const resourceAccessRoot = isRecord(payload.resource_access) ? payload.resource_access : {}
  const resourceAccess = clientId && isRecord(resourceAccessRoot[clientId])
    ? resourceAccessRoot[clientId]
    : {}
  const realmAccess = isRecord(payload.realm_access) ? payload.realm_access : {}

  const roles = mergeStringArrays(
    explicit.roles,
    embedded.roles,
    getPath(payload, claims.roles),
    user.roles,
    payload.roles,
    realmAccess.roles,
    resourceAccess.roles,
  )
  const permissions = mergeStringArrays(
    explicit.permissions,
    embedded.permissions,
    getPath(payload, claims.permissions),
    user.permissions,
    payload.permissions,
  )
  const scopes = mergeStringArrays(
    explicit.scopes,
    embedded.scopes,
    getPath(payload, claims.scopes),
    user.scopes,
    payload.scope,
    payload.scopes,
  )
  const authenticationMethods = mergeStringArrays(
    explicit.authenticationMethods,
    embedded.authenticationMethods,
    getPath(payload, claims.authenticationMethods),
    payload.amr,
    provider,
  )

  const fallbackAal = options.defaultAssuranceLevel ?? 'aal1'

  return {
    subject,
    provider,
    tenantId: toStringValue(firstDefined(
      explicit.tenantId,
      embedded.tenantId,
      getPath(payload, claims.tenant),
      payload.tenant_id,
      user.tenantId,
    )),
    organizationId: toStringValue(firstDefined(
      explicit.organizationId,
      embedded.organizationId,
      getPath(payload, claims.organization),
      payload.organization_id,
      user.organizationId,
    )),
    sessionId: toStringValue(firstDefined(
      explicit.sessionId,
      embedded.sessionId,
      getPath(payload, claims.session),
      payload.sid,
    )),
    username: toStringValue(firstDefined(
      explicit.username,
      embedded.username,
      getPath(payload, claims.username),
      payload.preferred_username,
      user.username,
      user.userId,
    )),
    email: toStringValue(firstDefined(
      explicit.email,
      embedded.email,
      getPath(payload, claims.email),
      payload.email,
      user.email,
    )),
    roles,
    permissions,
    scopes,
    authenticationMethods,
    assuranceLevel: normalizeAssuranceLevel(
      firstDefined(explicit.assuranceLevel, embedded.assuranceLevel, getPath(payload, claims.assuranceLevel), payload.acr),
      fallbackAal,
    ),
    issuedAt: numericDate(firstDefined(explicit.issuedAt, embedded.issuedAt, payload.iat)),
    expiresAt: numericDate(firstDefined(explicit.expiresAt, embedded.expiresAt, payload.exp)),
  }
}

export function toNfzPrincipalJwtClaims(principal: NfzPrincipal): Record<string, unknown> {
  return {
    subject: principal.subject,
    provider: principal.provider,
    tenantId: principal.tenantId,
    organizationId: principal.organizationId,
    sessionId: principal.sessionId,
    roles: principal.roles,
    permissions: principal.permissions,
    scopes: principal.scopes,
    authenticationMethods: principal.authenticationMethods,
    assuranceLevel: principal.assuranceLevel,
  }
}
