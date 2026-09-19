import type { ResolvedCacheOptions } from '../options/cache'

export interface NfzCacheSetOptions {
  /** TTL override in milliseconds. `0` or `null` means no expiration. */
  ttlMs?: number | null
}

export interface NfzCacheStore {
  get(key: string): Promise<unknown | undefined>
  set(key: string, value: unknown, options?: NfzCacheSetOptions): Promise<void>
  remove(key: string): Promise<boolean>
  clear(prefix?: string): Promise<number>
  has(key: string): Promise<boolean>
  size?(): Promise<number>
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
  provider: 'memory'
  namespace: string
  defaultTtlMs: number
  maxEntries: number
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

export function createMemoryCacheStore(options: Pick<ResolvedCacheOptions, 'maxEntries'>): NfzCacheStore {
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
    async get(key) {
      return read(key)?.value
    },
    async set(key, value, setOptions) {
      evictForInsert(key)
      const ttlMs = setOptions?.ttlMs ?? null
      entries.set(key, {
        value,
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

  constructor(options: ResolvedCacheOptions, store: NfzCacheStore = createMemoryCacheStore(options)) {
    this.#options = options
    this.#store = store
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
    return {
      enabled: true,
      provider: 'memory',
      namespace: this.#options.namespace,
      defaultTtlMs: this.#options.defaultTtlMs,
      maxEntries: this.#options.maxEntries,
      failOpen: this.#options.failOpen,
      entries,
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
