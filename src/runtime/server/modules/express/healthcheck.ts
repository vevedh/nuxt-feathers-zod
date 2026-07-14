export default async function healthcheckServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions
  if (options === false)
    return

  const framework = app?.get?.('framework')
  if (framework && framework !== 'express')
    return

  const expressApp = typeof app?.getApp === 'function' ? app.getApp() : app
  if (!expressApp?.get)
    return

  const path = options && typeof options === 'object' && options.path ? String(options.path) : '/healthz'
  const payload = options && typeof options === 'object' && options.payload ? options.payload : { status: 'ok' }

  expressApp.get(path, (_req: any, res: any) => {
    res.status(200).json(payload)
  })

  app.set('nfzModuleHealthcheckLoaded', true)
}
