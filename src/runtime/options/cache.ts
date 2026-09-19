export type NfzCacheProvider = 'memory'

export interface CacheOptions {
  /** Enable the native NFZ server cache. Disabled by default. */
  enabled?: boolean
  /** Cache backend. Patch073 r1 intentionally supports only the in-process memory provider. */
  provider?: NfzCacheProvider
  /** Logical prefix applied to every cache key. */
  namespace?: string
  /** Default TTL in milliseconds. Use 0 for entries that do not expire. */
  defaultTtlMs?: number
  /** Maximum number of entries retained by the in-process memory store. */
  maxEntries?: number
  /** Treat cache backend errors as misses/write failures instead of failing the business request. */
  failOpen?: boolean
}

export interface ResolvedCacheOptions {
  enabled: true
  provider: 'memory'
  namespace: string
  defaultTtlMs: number
  maxEntries: number
  failOpen: boolean
}

export type ResolvedCacheOptionsOrDisabled = ResolvedCacheOptions | false

export const NFZ_CACHE_DEFAULTS = Object.freeze({
  namespace: 'nfz',
  defaultTtlMs: 60_000,
  maxEntries: 1_000,
  failOpen: true,
} as const)

const NAMESPACE_PATTERN = /^[a-z\d][\w:-]{0,63}$/i

function resolveNonNegativeInteger(value: unknown, fallback: number, label: string): number {
  if (value === undefined)
    return fallback
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error(`${label} must be a non-negative safe integer.`)
  return Number(value)
}

export function resolveCacheOptions(input: CacheOptions | boolean | undefined): ResolvedCacheOptionsOrDisabled {
  if (input === undefined || input === false)
    return false

  const options: CacheOptions = input === true ? {} : input
  if (options.enabled === false)
    return false

  const provider = options.provider ?? 'memory'
  if (provider !== 'memory')
    throw new Error(`cache.provider '${String(provider)}' is not supported in 6.8.0 Patch073 r1. Use 'memory'.`)

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
  const maxEntries = resolveNonNegativeInteger(
    options.maxEntries,
    NFZ_CACHE_DEFAULTS.maxEntries,
    'cache.maxEntries',
  )
  if (maxEntries < 1 || maxEntries > 100_000)
    throw new Error('cache.maxEntries must be between 1 and 100000.')

  return {
    enabled: true,
    provider,
    namespace,
    defaultTtlMs,
    maxEntries,
    failOpen: options.failOpen !== false,
  }
}
