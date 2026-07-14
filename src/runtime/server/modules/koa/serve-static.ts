export default async function serveStaticServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions
  if (options === false)
    return

  const framework = ctx?.transports?.rest?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  if (!app?.use)
    return

  const path = options && typeof options === 'object' && options.path ? String(options.path) : '/'
  const dir = options && typeof options === 'object' && options.dir ? String(options.dir) : 'public'

  try {
    const mod = await import('koa-static')
    const koaStatic = (mod as any).default ?? mod
    app.use(async (koaCtx: any, next: any) => {
      if (path !== '/' && !String(koaCtx.path || '').startsWith(path))
        return next()
      return koaStatic(dir)(koaCtx, next)
    })
    app.set?.('nfzModuleServeStaticLoaded', true)
  }
  catch {
    console.warn('[nuxt-feathers-zod] server module "serve-static" skipped for Koa: install koa-static in the host app to enable it.')
  }
}
