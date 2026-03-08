export function getAccessTokenFromResult(result: any): string | null {
  if (!result || typeof result !== 'object')
    return null

  const direct = (result as any).accessToken
  if (typeof direct === 'string' && direct)
    return direct

  const nested = (result as any).authentication?.accessToken
  if (typeof nested === 'string' && nested)
    return nested

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
