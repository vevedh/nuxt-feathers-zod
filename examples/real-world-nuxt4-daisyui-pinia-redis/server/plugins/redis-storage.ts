import redisDriver from 'unstorage/drivers/redis'

interface RedisRuntimeConfig {
  enabled?: boolean
  url?: string
  prefix?: string
}

export default defineNitroPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const redis = runtimeConfig.redis as RedisRuntimeConfig

  if (redis.enabled === false)
    return

  const url = String(redis.url || '').trim()
  if (!url)
    throw new Error('[nfz-daisyui] REDIS_URL is required when Redis cache is enabled.')

  const storage = useStorage()
  storage.mount('nfz-cache', redisDriver({
    url,
    base: String(redis.prefix || 'nfz:daisyui'),
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 1,
  }))
})
