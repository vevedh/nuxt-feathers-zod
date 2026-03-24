export function getAccessTokenFromResult(result: any): string | null {
  if (!result || typeof result !== 'object')
    return null

  const directAliases = [
    result.accessToken,
    result.access_token,
    result.token,
  ]
  for (const candidate of directAliases) {
    if (typeof candidate === 'string' && candidate)
      return candidate
  }

  const nestedAliases = [
    result.authentication?.accessToken,
    result.authentication?.access_token,
    result.authentication?.token,
  ]
  for (const candidate of nestedAliases) {
    if (typeof candidate === 'string' && candidate)
      return candidate
  }

  return null
}

export interface RemoteAuthLikeOptions {
  enabled?: boolean
  payloadMode?: 'jwt' | 'keycloak'
  strategy?: string
  tokenField?: string
  servicePath?: string
  reauth?: boolean
  storageKey?: string
}

export function getRemoteTokenField(options?: RemoteAuthLikeOptions | null): string {
  if (typeof options?.tokenField === 'string' && options.tokenField.trim())
    return options.tokenField.trim()
  return options?.payloadMode === 'keycloak' ? 'access_token' : 'accessToken'
}

export function buildRemoteAuthPayload(token: string, options?: RemoteAuthLikeOptions | null): Record<string, any> {
  const strategy = options?.strategy || 'jwt'
  const tokenField = getRemoteTokenField(options)
  const payload: Record<string, any> = { strategy }
  payload[tokenField] = token

  const aliases = ['accessToken', 'access_token', 'token']
  for (const alias of aliases) {
    if (!(alias in payload))
      payload[alias] = token
  }

  if (options?.payloadMode)
    payload.payloadMode = options.payloadMode

  return payload
}
