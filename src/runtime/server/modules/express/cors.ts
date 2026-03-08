export default async function corsServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions === undefined ? true : ctx.moduleOptions
  if (options === false)
    return

  const framework = app?.get?.('framework')
  if (framework && framework !== 'express')
    return

  const expressApp = typeof app?.getApp === 'function' ? app.getApp() : app
  if (!expressApp?.use)
    return

  try {
    const mod = await import('cors')
    const cors = (mod as any).default ?? mod
    expressApp.use(cors(options === true ? undefined : options))
    app.set('nfzModuleCorsLoaded', true)
  }
  catch {
    console.warn('[nuxt-feathers-zod] server module "cors" skipped: install cors in the host app to enable it.')
  }
}
