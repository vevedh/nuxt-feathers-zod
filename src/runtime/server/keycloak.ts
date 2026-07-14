import { createRemoteJWKSet, jwtVerify } from 'jose'

export interface NfzKeycloakConfig {
  serverUrl: string
  realm: string
  clientId: string
  issuer?: string
  audience?: string | string[]
  secret?: string
  userService: string
  serviceIdField: string
  authServicePath: string
  permissions?: boolean
  userProvisioning?: 'disabled' | 'create-if-missing'
  failOpen?: boolean
}

function getBearer(headers: Record<string, unknown> | undefined | null): string | null {
  const auth = headers?.authorization || headers?.Authorization
  if (!auth || typeof auth !== 'string')
    return null
  if (!auth.startsWith('Bearer '))
    return null
  return auth.slice(7)
}

function verifiedIdentity(cfg: NfzKeycloakConfig, payload: any, hintedUser?: any): any {
  return {
    ...(hintedUser && typeof hintedUser === 'object' ? hintedUser : {}),
    ...payload,
    [cfg.serviceIdField]: payload?.sub,
  }
}

async function resolveUser(app: any, cfg: NfzKeycloakConfig, payload: any, hintedUser?: any): Promise<any> {
  const sub = payload?.sub
  if (!sub)
    throw new Error('[nuxt-feathers-zod] Keycloak token does not contain a subject.')

  try {
    const users = app.service(cfg.userService)
    const found = await users.find({ query: { [cfg.serviceIdField]: sub }, paginate: false })
    const first = Array.isArray(found) ? found[0] : (found?.data?.[0] ?? null)
    if (first)
      return { ...hintedUser, ...payload, ...first }

    if (cfg.userProvisioning === 'create-if-missing') {
      return await users.create({
        ...(hintedUser && typeof hintedUser === 'object' ? hintedUser : {}),
        preferred_username: hintedUser?.preferred_username
          || payload?.preferred_username
          || hintedUser?.email
          || payload?.email,
        email: hintedUser?.email || payload?.email,
        [cfg.serviceIdField]: sub,
      })
    }

    return verifiedIdentity(cfg, payload, hintedUser)
  }
  catch (error) {
    if (cfg.failOpen === true)
      return verifiedIdentity(cfg, payload, hintedUser)
    throw error
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
    context.params.user = await resolveUser(app, cfg, payload)
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
      if (!token)
        throw new Error('[nuxt-feathers-zod] A Keycloak access token is required.')

      const fakeCtx: any = {
        app,
        params: { headers: { Authorization: `Bearer ${token}` }, provider: 'rest' },
      }

      await hook(fakeCtx)
      if (!fakeCtx.params.user)
        throw new Error('[nuxt-feathers-zod] Keycloak token validation did not resolve a user.')

      const user = hintedUser
        ? { ...hintedUser, ...fakeCtx.params.user }
        : fakeCtx.params.user

      return {
        user,
        permissions: fakeCtx.params.permissions,
        accessToken: token,
        authentication: { strategy: 'keycloak', accessToken: token },
        keycloakUser: fakeCtx.params.client || null,
        bridge: {
          strategy: 'keycloak',
          validated: true,
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
