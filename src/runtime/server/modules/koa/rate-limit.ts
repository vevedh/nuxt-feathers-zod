export default async function rateLimitServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions
  if (options === false)
    return

  const framework = ctx?.transports?.rest?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  if (!app?.use)
    return

  const max = options && typeof options === 'object' && typeof options.max === 'number' ? options.max : 100
  const windowMs = options && typeof options === 'object' && typeof options.windowMs === 'number' ? options.windowMs : 60_000
  const message = options && typeof options === 'object' && options.message ? options.message : 'Too Many Requests'
  const hits = new Map<string, { count: number, resetAt: number }>()

  app.use(async (koaCtx: any, next: any) => {
    const now = Date.now()
    const key = String(koaCtx.ip || koaCtx.request?.ip || koaCtx.headers['x-forwarded-for'] || 'global')
    const current = hits.get(key)

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    current.count += 1
    if (current.count > max) {
      koaCtx.status = 429
      koaCtx.body = { error: message, retryAfterMs: current.resetAt - now }
      return
    }

    await next()
  })

  app.set?.('nfzModuleRateLimitLoaded', true)
}
