import type { Application } from 'nuxt-feathers-zod/server'
import { createError, getHeader, getQuery } from 'h3'
import { waitForNfzRuntimeInstance } from 'nuxt-feathers-zod/server-instance-registry'

interface CountResult {
  total?: number
  data?: unknown[]
}

interface AuthResult {
  user?: {
    roles?: string[]
  }
}

interface JwtAuthenticationService {
  create(data: { strategy: 'jwt', accessToken: string }): Promise<AuthResult>
}

interface CountableService {
  find(params: { query: { $limit: number } }): Promise<CountResult | unknown[]>
}

interface DashboardSummary {
  users: number
  messages: number
  generatedAt: string
  cache: 'redis' | 'origin'
  ttlSeconds: number
}

function bearerToken(value: string | undefined): string {
  const header = value?.trim() || ''
  const prefix = 'bearer '
  if (!header.toLowerCase().startsWith(prefix))
    throw createError({ statusCode: 401, statusMessage: 'Bearer token required.' })

  const token = header.slice(prefix.length).trim()
  if (!token)
    throw createError({ statusCode: 401, statusMessage: 'Bearer token required.' })

  return token
}

function totalOf(result: CountResult | unknown[]): number {
  if (Array.isArray(result))
    return result.length
  if (typeof result.total === 'number')
    return result.total
  return Array.isArray(result.data) ? result.data.length : 0
}

export default defineEventHandler(async (event): Promise<DashboardSummary> => {
  const token = bearerToken(getHeader(event, 'authorization'))
  const instance = await waitForNfzRuntimeInstance<Application>('default')
  const app = instance.app
  if (!app)
    throw createError({ statusCode: 503, statusMessage: 'NFZ runtime is not ready.' })

  const authentication = app.service('authentication') as unknown as JwtAuthenticationService
  const auth = await authentication.create({
    strategy: 'jwt',
    accessToken: token,
  })

  const roles = Array.isArray(auth.user?.roles)
    ? auth.user.roles.map(role => String(role).toLowerCase())
    : []
  if (!roles.some(role => role === 'admin' || role === 'member'))
    throw createError({ statusCode: 403, statusMessage: 'Dashboard role required.' })

  const runtimeConfig = useRuntimeConfig()
  const ttlSeconds = Math.max(5, Number(runtimeConfig.redis.ttlSeconds || 60))
  const redisEnabled = runtimeConfig.redis.enabled !== false
  const refresh = getQuery(event).refresh === '1'
  const cacheKey = 'dashboard:summary:v1'

  if (redisEnabled && !refresh) {
    try {
      const cached = await useStorage('nfz-cache').getItem<Omit<DashboardSummary, 'cache'>>(cacheKey)
      if (cached) {
        return {
          ...cached,
          cache: 'redis',
        }
      }
    }
    catch {
      console.warn('[nfz-daisyui] Redis cache read unavailable; using origin services.')
    }
  }

  const usersService = app.service('users') as unknown as CountableService
  const messagesService = app.service('messages') as unknown as CountableService
  const [users, messages] = await Promise.all([
    usersService.find({ query: { $limit: 1 } }),
    messagesService.find({ query: { $limit: 1 } }),
  ])

  const origin = {
    users: totalOf(users),
    messages: totalOf(messages),
    generatedAt: new Date().toISOString(),
    ttlSeconds,
  }

  if (redisEnabled) {
    try {
      await useStorage('nfz-cache').setItem(cacheKey, origin, { ttl: ttlSeconds })
    }
    catch {
      console.warn('[nfz-daisyui] Redis cache write unavailable; response remains valid.')
    }
  }

  return {
    ...origin,
    cache: 'origin',
  }
})
