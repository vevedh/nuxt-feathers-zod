export default async function compressionServerModule(app: any, ctx: any = {}) {
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
    const mod = await import('compression')
    const compression = (mod as any).default ?? mod
    expressApp.use(compression(options === true ? undefined : options))
    app.set('nfzModuleCompressionLoaded', true)
  }
  catch {
    console.warn('[nuxt-feathers-zod] server module "compression" skipped: install compression in the host app to enable it.')
  }
}
