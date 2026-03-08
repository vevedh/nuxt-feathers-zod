export default async function helmetServerModule(app: any, ctx: any = {}) {
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
    const mod = await import('helmet')
    const helmet = (mod as any).default ?? mod
    expressApp.use(helmet(options === true ? undefined : options))
    app.set('nfzModuleHelmetLoaded', true)
  }
  catch {
    console.warn('[nuxt-feathers-zod] server module "helmet" skipped: install helmet in the host app to enable it.')
  }
}
