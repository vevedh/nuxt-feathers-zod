import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface NfzKeycloakConfig {
  serverUrl: string
  realm: string
  clientId: string
  issuer?: string
  audience?: string
  secret?: string
  userService: string
  serviceIdField: string
  authServicePath: string
  permissions?: boolean
}

function getBearer(headers: Record<string, unknown> | undefined | null): string | null {
  const auth = headers?.authorization || headers?.Authorization
  if (!auth || typeof auth !== 'string')
    return null
  if (!auth.startsWith('Bearer '))
    return null
  return auth.slice(7)
}

async function safeResolveUser(app: any, cfg: NfzKeycloakConfig, payload: any, hintedUser?: any): Promise<any> {
  const sub = payload?.sub
  if (!sub)
    return hintedUser || payload

  try {
    const users = app.service(cfg.userService)
    const found = await users.find({ query: { [cfg.serviceIdField]: sub }, paginate: false })
    const first = Array.isArray(found) ? found[0] : (found?.data?.[0] ?? null)
    if (first)
      return { ...hintedUser, ...payload, ...first }

    const created = await users.create({
      [cfg.serviceIdField]: sub,
      ...(hintedUser && typeof hintedUser === 'object' ? hintedUser : {}),
      preferred_username: hintedUser?.preferred_username
        || payload?.preferred_username
        || hintedUser?.email
        || payload?.email,
      email: hintedUser?.email || payload?.email,
    })
    return created
  }
  catch {
    return { [cfg.serviceIdField]: sub, ...(hintedUser && typeof hintedUser === 'object' ? hintedUser : {}), ...payload }
  }
}

export function createKeycloakAuthorizationHook(app: any, cfg: NfzKeycloakConfig) {
  const issuer = cfg.issuer || `${cfg.serverUrl.replace(/\/$/, '')}/realms/${cfg.realm}`
  const audience = cfg.audience || cfg.clientId
  const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`))

  return async (context: any) => {
    if (!context.params?.provider)
      return context

    const token = getBearer(context.params?.headers)
    if (!token)
      return context

    const verified = await jwtVerify(token, jwks, {
      issuer,
      audience,
    })

    const payload = verified.payload
    context.params.client = payload
    context.params.user = await safeResolveUser(app, cfg, payload)
    context.params.permissions = []

    return context
  }
}

export function createKeycloakBridgeService(app: any, cfg: NfzKeycloakConfig) {
  const hook = createKeycloakAuthorizationHook(app, cfg)

  return {
    async create(data: any) {
      const token = data?.access_token || data?.accessToken || data?.jwt || data?.token
      const hintedUser = data?.keycloakUser || data?.user || data?.tokenParsed || null
      const fakeCtx: any = {
        app,
        params: { headers: { Authorization: token ? `Bearer ${token}` : '' }, provider: 'rest' },
      }

      await hook(fakeCtx)

      if (!fakeCtx.params.user && hintedUser)
        fakeCtx.params.user = hintedUser

      return {
        user: fakeCtx.params.user,
        permissions: fakeCtx.params.permissions,
        accessToken: token || null,
        authentication: token ? { strategy: 'keycloak', accessToken: token } : undefined,
        keycloakUser: hintedUser || fakeCtx.params.client || null,
        bridge: {
          strategy: token ? 'keycloak' : null,
          validated: Boolean(fakeCtx.params.user || hintedUser),
          userService: cfg.userService,
          serviceIdField: cfg.serviceIdField,
          authServicePath: cfg.authServicePath,
        },
      }
    },

    async patch(_id: unknown, data: any) {
      return this.create(data)
    },

    async remove() {
      return { ok: true }
    },
  }
}

export async function configureKeycloakBridge(app: any, cfg: NfzKeycloakConfig): Promise<void> {
  app.hooks({ before: [createKeycloakAuthorizationHook(app, cfg)] })
  app.use(cfg.authServicePath, createKeycloakBridgeService(app, cfg))
}
