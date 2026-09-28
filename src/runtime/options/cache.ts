export type NfzCacheProvider = 'memory' | 'redis'
export type NfzRedisProtocol = 'redis' | 'rediss'

export interface RedisCacheOptions {
  /** Server-only Redis/Valkey URL. Credentials must never be exposed through runtimeConfig.public. */
  url: string
  /** Connection timeout in milliseconds. */
  connectTimeoutMs?: number
  /** Command timeout in milliseconds. */
  commandTimeoutMs?: number
  /** Maximum reconnect attempts before the provider reports unavailable. */
  maxReconnectAttempts?: number
}

interface CacheOptionsBase {
  enabled?: boolean
  namespace?: string
  defaultTtlMs?: number
  failOpen?: boolean
}

export interface MemoryCacheOptions extends CacheOptionsBase {
  provider?: 'memory'
  /** Maximum number of entries retained by the in-process memory store. */
  maxEntries?: number
  redis?: never
}

export interface DistributedCacheOptions extends CacheOptionsBase {
  provider: 'redis'
  /** Redis and Valkey share the Redis wire protocol. */
  redis: RedisCacheOptions
  maxEntries?: never
}

export type CacheOptions = MemoryCacheOptions | DistributedCacheOptions

interface ResolvedCacheOptionsBase {
  enabled: true
  namespace: string
  defaultTtlMs: number
  failOpen: boolean
}

export interface ResolvedMemoryCacheOptions extends ResolvedCacheOptionsBase {
  provider: 'memory'
  maxEntries: number
}

export interface ResolvedRedisCacheOptions extends ResolvedCacheOptionsBase {
  provider: 'redis'
  redis: {
    url: string
    protocol: NfzRedisProtocol
    connectTimeoutMs: number
    commandTimeoutMs: number
    maxReconnectAttempts: number
  }
}

export type ResolvedCacheOptions = ResolvedMemoryCacheOptions | ResolvedRedisCacheOptions
export type ResolvedCacheOptionsOrDisabled = ResolvedCacheOptions | false

export const NFZ_CACHE_DEFAULTS = Object.freeze({
  namespace: 'nfz',
  defaultTtlMs: 60_000,
  maxEntries: 1_000,
  failOpen: true,
  redis: Object.freeze({
    connectTimeoutMs: 2_000,
    commandTimeoutMs: 2_000,
    maxReconnectAttempts: 3,
  }),
} as const)

const NAMESPACE_PATTERN = /^[a-z\d][\w:-]{0,63}$/i

function resolveNonNegativeInteger(value: unknown, fallback: number, label: string): number {
  if (value === undefined)
    return fallback
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error(`${label} must be a non-negative safe integer.`)
  return Number(value)
}

function resolvePositiveInteger(value: unknown, fallback: number, label: string, max: number): number {
  const resolved = resolveNonNegativeInteger(value, fallback, label)
  if (resolved < 1 || resolved > max)
    throw new Error(`${label} must be between 1 and ${max}.`)
  return resolved
}

function resolveRedisUrl(value: unknown): { url: string, protocol: NfzRedisProtocol } {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('cache.redis.url is required when cache.provider is redis.')

  let parsed: URL
  try {
    parsed = new URL(value.trim())
  }
  catch {
    throw new Error('cache.redis.url must be a valid redis:// or rediss:// URL.')
  }
  if (parsed.protocol !== 'redis:' && parsed.protocol !== 'rediss:')
    throw new Error('cache.redis.url must use the redis:// or rediss:// protocol.')
  if (!parsed.hostname)
    throw new Error('cache.redis.url must include a hostname.')

  return { url: parsed.toString(), protocol: parsed.protocol.slice(0, -1) as NfzRedisProtocol }
}

export function resolveCacheOptions(input: CacheOptions | boolean | undefined): ResolvedCacheOptionsOrDisabled {
  if (input === undefined || input === false)
    return false

  const options: CacheOptions = input === true ? {} : input
  if (options.enabled === false)
    return false

  const provider = options.provider ?? 'memory'
  const namespace = String(options.namespace ?? NFZ_CACHE_DEFAULTS.namespace).trim()
  if (!NAMESPACE_PATTERN.test(namespace)) {
    throw new Error(
      'cache.namespace must start with an alphanumeric character and contain only alphanumeric, colon, underscore or hyphen characters (maximum 64 characters).',
    )
  }

  const defaultTtlMs = resolveNonNegativeInteger(
    options.defaultTtlMs,
    NFZ_CACHE_DEFAULTS.defaultTtlMs,
    'cache.defaultTtlMs',
  )
  const failOpen = options.failOpen !== false

  if (provider === 'memory') {
    const maxEntries = resolvePositiveInteger(
      options.maxEntries,
      NFZ_CACHE_DEFAULTS.maxEntries,
      'cache.maxEntries',
      100_000,
    )
    return { enabled: true, provider, namespace, defaultTtlMs, maxEntries, failOpen }
  }

  if (provider === 'redis') {
    const { url, protocol } = resolveRedisUrl(options.redis?.url)
    return {
      enabled: true,
      provider,
      namespace,
      defaultTtlMs,
      failOpen,
      redis: {
        url,
        protocol,
        connectTimeoutMs: resolvePositiveInteger(options.redis?.connectTimeoutMs, NFZ_CACHE_DEFAULTS.redis.connectTimeoutMs, 'cache.redis.connectTimeoutMs', 60_000),
        commandTimeoutMs: resolvePositiveInteger(options.redis?.commandTimeoutMs, NFZ_CACHE_DEFAULTS.redis.commandTimeoutMs, 'cache.redis.commandTimeoutMs', 60_000),
        maxReconnectAttempts: resolveNonNegativeInteger(options.redis?.maxReconnectAttempts, NFZ_CACHE_DEFAULTS.redis.maxReconnectAttempts, 'cache.redis.maxReconnectAttempts'),
      },
    }
  }

  throw new Error(`cache.provider '${String(provider)}' is not supported. Use 'memory' or 'redis'.`)
}
