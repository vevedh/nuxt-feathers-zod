export default async function healthcheckServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions
  if (options === false)
    return

  const framework = ctx?.transports?.rest?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  if (!app?.use)
    return

  const path = options && typeof options === 'object' && options.path ? String(options.path) : '/healthz'
  const payload = options && typeof options === 'object' && options.payload ? options.payload : { status: 'ok' }

  app.use(async (koaCtx: any, next: any) => {
    if (koaCtx.path === path) {
      koaCtx.status = 200
      koaCtx.body = payload
      return
    }
    await next()
  })

  app.set?.('nfzModuleHealthcheckLoaded', true)
}
