export default async function serveStaticServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions
  if (options === false)
    return

  const framework = app?.get?.('framework')
  if (framework && framework !== 'express')
    return

  const expressApp = typeof app?.getApp === 'function' ? app.getApp() : app
  if (!expressApp?.use)
    return

  const mod = await import('@feathersjs/express')
  const serveStatic = (mod as any).serveStatic

  const path = options && typeof options === 'object' && options.path ? String(options.path) : '/'
  const dir = options && typeof options === 'object' && options.dir ? String(options.dir) : 'public'

  expressApp.use(path, serveStatic(dir))
  app.set('nfzModuleServeStaticLoaded', true)
}
