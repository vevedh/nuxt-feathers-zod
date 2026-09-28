import type { NfzCacheProvider, ResolvedCacheOptions, ResolvedMemoryCacheOptions, ResolvedRedisCacheOptions } from '../options/cache'

export interface NfzCacheSetOptions {
  /** TTL override in milliseconds. `0` or `null` means no expiration. */
  ttlMs?: number | null
}

export type NfzCacheHealthStatus = 'ready' | 'degraded' | 'unavailable'

export interface NfzCacheStoreHealth {
  status: NfzCacheHealthStatus
  latencyMs?: number
}

export interface NfzCacheStore {
  readonly provider?: NfzCacheProvider
  get(key: string): Promise<unknown | undefined>
  set(key: string, value: unknown, options?: NfzCacheSetOptions): Promise<void>
  remove(key: string): Promise<boolean>
  clear(prefix?: string): Promise<number>
  has(key: string): Promise<boolean>
  size?(): Promise<number>
  health?(): Promise<NfzCacheStoreHealth>
  close(): Promise<void>
}

export interface NfzCacheStatistics {
  hits: number
  misses: number
  sets: number
  removes: number
  clears: number
  errors: number
}

export interface NfzCacheDiagnostics {
  enabled: true
  provider: NfzCacheProvider
  namespace: string
  defaultTtlMs: number
  maxEntries: number | null
  health: NfzCacheStoreHealth
  failOpen: boolean
  entries: number | null
  inflight: number
  stats: Readonly<NfzCacheStatistics>
}

interface MemoryCacheEntry {
  value: unknown
  expiresAt: number | null
}

const CACHE_KEY_PATTERN = /^[a-z\d][\w:./-]{0,511}$/i

function normalizeTtl(value: number | null | undefined, fallback: number): number | null {
  const resolved = value === undefined ? fallback : value
  if (resolved === null || resolved === 0)
    return null
  if (!Number.isSafeInteger(resolved) || resolved < 0)
    throw new TypeError('Cache TTL must be a non-negative safe integer, 0, or null.')
  return resolved
}

export function normalizeNfzCacheKey(key: string): string {
  const normalized = String(key || '').trim()
  if (!CACHE_KEY_PATTERN.test(normalized)) {
    throw new TypeError(
      'Cache key must start with an alphanumeric character, use only alphanumeric/:_.- characters, and be at most 512 characters.',
    )
  }
  return normalized
}

function cloneCacheValue<T>(value: T): T {
  return deserializeRedisValue(serializeRedisValue(value)) as T
}

interface RedisWireEnvelope {
  version: 1
  value: unknown
}

interface RedisClientLike {
  status: string
  connect(): Promise<unknown>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>
  del(key: string): Promise<number>
  exists(key: string): Promise<number>
  ping(): Promise<string>
  scan(cursor: string, ...args: Array<string | number>): Promise<[string, string[]]>
  unlink(...keys: string[]): Promise<number>
  quit(): Promise<unknown>
  disconnect(): void
  on(event: 'error', listener: (error: Error) => void): unknown
}

type RedisClientConstructor = new (url: string, options: Record<string, unknown>) => RedisClientLike

function serializeRedisValue(value: unknown): string {
  if (value === undefined)
    throw new TypeError('NFZ cache does not store undefined values.')
  try {
    const encoded = JSON.stringify({ version: 1, value } satisfies RedisWireEnvelope)
    if (encoded === undefined)
      throw new TypeError('unsupported value')
    return encoded
  }
  catch {
    throw new TypeError('NFZ Redis cache values must be JSON serializable.')
  }
}

function deserializeRedisValue(payload: string): unknown {
  let decoded: unknown
  try {
    decoded = JSON.parse(payload)
  }
  catch {
    throw new TypeError('NFZ Redis cache entry is not valid JSON.')
  }
  if (!decoded || typeof decoded !== 'object' || (decoded as RedisWireEnvelope).version !== 1 || !('value' in decoded))
    throw new TypeError('NFZ Redis cache entry uses an unsupported wire format.')
  return (decoded as RedisWireEnvelope).value
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`NFZ Redis ${label} timed out after ${timeoutMs}ms.`)), timeoutMs)
  })
  return Promise.race([operation, timeout]).finally(() => {
    if (timer)
      clearTimeout(timer)
  })
}

export function createRedisCacheStore(
  options: ResolvedRedisCacheOptions,
  injectedConstructor?: RedisClientConstructor,
): NfzCacheStore {
  let client: RedisClientLike | undefined
  let connecting: Promise<RedisClientLike> | undefined
  let closed = false

  async function resolveConstructor(): Promise<RedisClientConstructor> {
    if (injectedConstructor)
      return injectedConstructor
    const module = await import('ioredis')
    return (module.default ?? module.Redis) as unknown as RedisClientConstructor
  }

  async function ensureClient(): Promise<RedisClientLike> {
    if (closed)
      throw new Error('NFZ Redis cache store is closed.')
    if (client?.status === 'ready')
      return client
    if (connecting)
      return connecting

    connecting = (async () => {
      const Redis = await resolveConstructor()
      const candidate = new Redis(options.redis.url, {
        connectTimeout: options.redis.connectTimeoutMs,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy(attempt: number) {
          if (attempt > options.redis.maxReconnectAttempts)
            return null
          return Math.min(50 * (2 ** Math.max(0, attempt - 1)), 1_000)
        },
      })
      candidate.on('error', () => {})
      client = candidate
      if (candidate.status !== 'ready') {
        try {
          await withTimeout(candidate.connect(), options.redis.connectTimeoutMs, 'connect')
        }
        catch (error) {
          candidate.disconnect()
          if (client === candidate)
            client = undefined
          throw error
        }
      }
      return candidate
    })().finally(() => {
      connecting = undefined
    })

    return connecting
  }

  async function command<T>(label: string, run: (active: RedisClientLike) => Promise<T>): Promise<T> {
    const active = await ensureClient()
    return withTimeout(run(active), options.redis.commandTimeoutMs, label)
  }

  async function scan(prefix: string | undefined, visit: (keys: string[]) => Promise<void>): Promise<void> {
    let cursor = '0'
    const match = prefix ? `${prefix}*` : '*'
    do {
      const response = await command('SCAN', active => active.scan(cursor, 'MATCH', match, 'COUNT', 100))
      cursor = String(response[0])
      await visit(response[1].map(String))
    } while (cursor !== '0')
  }

  return {
    provider: 'redis',
    async get(key) {
      const payload = await command('GET', active => active.get(key))
      return payload === null ? undefined : deserializeRedisValue(payload)
    },
    async set(key, value, setOptions) {
      const payload = serializeRedisValue(value)
      const ttlMs = setOptions?.ttlMs ?? null
      await command('SET', active => ttlMs === null || ttlMs === 0
        ? active.set(key, payload)
        : active.set(key, payload, 'PX', ttlMs))
    },
    async remove(key) {
      return (await command('DEL', active => active.del(key))) > 0
    },
    async clear(prefix) {
      let removed = 0
      await scan(prefix, async (keys) => {
        if (keys.length === 0)
          return
        removed += await command('UNLINK', active => active.unlink(...keys))
      })
      return removed
    },
    async has(key) {
      return (await command('EXISTS', active => active.exists(key))) > 0
    },
    async health() {
      const startedAt = performance.now()
      try {
        const pong = await command('PING', active => active.ping())
        return { status: pong === 'PONG' ? 'ready' : 'degraded', latencyMs: Math.max(0, performance.now() - startedAt) }
      }
      catch {
        return { status: 'unavailable', latencyMs: Math.max(0, performance.now() - startedAt) }
      }
    },
    async close() {
      closed = true
      const active = client
      client = undefined
      if (!active || active.status === 'end')
        return
      try {
        await withTimeout(active.quit(), options.redis.commandTimeoutMs, 'QUIT')
      }
      catch {
        active.disconnect()
      }
    },
  }
}

export function createMemoryCacheStore(options: Pick<ResolvedMemoryCacheOptions, 'maxEntries'>): NfzCacheStore {
  const entries = new Map<string, MemoryCacheEntry>()

  function read(key: string): MemoryCacheEntry | undefined {
    const entry = entries.get(key)
    if (!entry)
      return undefined
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      entries.delete(key)
      return undefined
    }
    return entry
  }

  function evictForInsert(key: string): void {
    if (entries.has(key))
      entries.delete(key)
    while (entries.size >= options.maxEntries) {
      const oldest = entries.keys().next().value
      if (oldest === undefined)
        break
      entries.delete(oldest)
    }
  }

  return {
    provider: 'memory',
    async get(key) {
      const value = read(key)?.value
      return value === undefined ? undefined : cloneCacheValue(value)
    },
    async set(key, value, setOptions) {
      evictForInsert(key)
      const ttlMs = setOptions?.ttlMs ?? null
      entries.set(key, {
        value: cloneCacheValue(value),
        expiresAt: ttlMs === null || ttlMs === 0 ? null : Date.now() + ttlMs,
      })
    },
    async remove(key) {
      return entries.delete(key)
    },
    async clear(prefix) {
      if (!prefix) {
        const count = entries.size
        entries.clear()
        return count
      }
      let removed = 0
      for (const key of entries.keys()) {
        if (key.startsWith(prefix)) {
          entries.delete(key)
          removed += 1
        }
      }
      return removed
    },
    async has(key) {
      return read(key) !== undefined
    },
    async size() {
      let count = 0
      for (const key of [...entries.keys()]) {
        if (read(key))
          count += 1
      }
      return count
    },
    async health() {
      return { status: 'ready' }
    },
    async close() {
      entries.clear()
    },
  }
}

export class NfzCache {
  readonly #options: ResolvedCacheOptions
  readonly #store: NfzCacheStore
  readonly #inflight = new Map<string, Promise<unknown>>()
  readonly #stats: NfzCacheStatistics = {
    hits: 0,
    misses: 0,
    sets: 0,
    removes: 0,
    clears: 0,
    errors: 0,
  }

  constructor(options: ResolvedCacheOptions, store?: NfzCacheStore) {
    this.#options = options
    if (store) {
      if (store.provider && store.provider !== options.provider)
        throw new TypeError(`Cache store provider '${store.provider}' does not match configured provider '${options.provider}'.`)
      this.#store = store
    }
    else if (options.provider === 'memory') {
      this.#store = createMemoryCacheStore(options)
    }
    else {
      this.#store = createRedisCacheStore(options)
    }
  }

  #qualifiedKey(key: string): string {
    return `${this.#options.namespace}:${normalizeNfzCacheKey(key)}`
  }

  async #cacheOperation<T>(fallback: T, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    }
    catch (error) {
      this.#stats.errors += 1
      if (this.#options.failOpen)
        return fallback
      throw error
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const qualified = this.#qualifiedKey(key)
    const value = await this.#cacheOperation<unknown | undefined>(undefined, async () => this.#store.get(qualified))
    if (value === undefined) {
      this.#stats.misses += 1
      return undefined
    }
    this.#stats.hits += 1
    return value as T
  }

  async set<T>(key: string, value: T, options: NfzCacheSetOptions = {}): Promise<boolean> {
    if (value === undefined)
      throw new TypeError('NFZ cache does not store undefined values.')
    const qualified = this.#qualifiedKey(key)
    const ttlMs = normalizeTtl(options.ttlMs, this.#options.defaultTtlMs)
    const result = await this.#cacheOperation(false, async () => {
      await this.#store.set(qualified, value, { ttlMs })
      return true
    })
    if (result)
      this.#stats.sets += 1
    return result
  }

  async remove(key: string): Promise<boolean> {
    const qualified = this.#qualifiedKey(key)
    const removed = await this.#cacheOperation(false, async () => this.#store.remove(qualified))
    if (removed)
      this.#stats.removes += 1
    return removed
  }

  async clear(prefix?: string): Promise<number> {
    const qualifiedPrefix = prefix === undefined
      ? `${this.#options.namespace}:`
      : `${this.#options.namespace}:${normalizeNfzCacheKey(prefix)}`
    const removed = await this.#cacheOperation(0, async () => this.#store.clear(qualifiedPrefix))
    this.#stats.clears += 1
    return removed
  }

  async has(key: string): Promise<boolean> {
    const qualified = this.#qualifiedKey(key)
    return this.#cacheOperation(false, async () => this.#store.has(qualified))
  }

  async getOrSet<T>(key: string, producer: () => T | Promise<T>, options: NfzCacheSetOptions = {}): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== undefined)
      return cached

    const qualified = this.#qualifiedKey(key)
    const existing = this.#inflight.get(qualified)
    if (existing)
      return existing as Promise<T>

    const pending = Promise.resolve()
      .then(producer)
      .then(async (value) => {
        if (value === undefined)
          throw new TypeError('NFZ cache getOrSet producer must not return undefined.')
        await this.set(key, value, options)
        return value
      })
      .finally(() => {
        this.#inflight.delete(qualified)
      })

    this.#inflight.set(qualified, pending)
    return pending
  }

  async diagnostics(): Promise<NfzCacheDiagnostics> {
    const entries = this.#store.size
      ? await this.#cacheOperation<number | null>(null, async () => (await this.#store.size?.()) ?? null)
      : null
    const health = this.#store.health
      ? await this.#cacheOperation<NfzCacheStoreHealth>({ status: 'unavailable' }, async () => (await this.#store.health?.()) ?? { status: 'unavailable' })
      : { status: 'ready' as const }
    return {
      enabled: true,
      provider: this.#options.provider,
      namespace: this.#options.namespace,
      defaultTtlMs: this.#options.defaultTtlMs,
      maxEntries: this.#options.provider === 'memory' ? this.#options.maxEntries : null,
      failOpen: this.#options.failOpen,
      entries,
      health,
      inflight: this.#inflight.size,
      stats: { ...this.#stats },
    }
  }

  async close(): Promise<void> {
    await this.#cacheOperation(undefined, async () => {
      await this.#store.close()
      return undefined
    })
    this.#inflight.clear()
  }
}

export function createNfzCache(options: ResolvedCacheOptions, store?: NfzCacheStore): NfzCache {
  return new NfzCache(options, store)
}

export function configureNfzCache(app: any, options: ResolvedCacheOptions | false | undefined): NfzCache | undefined {
  if (!options || options.enabled !== true)
    return undefined
  const existing = app?.get?.('nfzCache')
  if (existing instanceof NfzCache)
    return existing
  const cache = createNfzCache(options)
  app?.set?.('nfzCache', cache)
  return cache
}

export function getNfzCache(app: any): NfzCache | undefined {
  return app?.get?.('nfzCache') as NfzCache | undefined
}
