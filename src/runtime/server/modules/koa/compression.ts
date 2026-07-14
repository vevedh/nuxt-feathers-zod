export default async function compressionServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions === undefined ? true : ctx.moduleOptions
  if (options === false)
    return

  const framework = ctx?.transports?.rest?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  if (!app?.use)
    return

  try {
    const mod = await import('koa-compress')
    const compression = (mod as any).default ?? mod
    app.use(compression(options === true ? undefined : options))
    app.set?.('nfzModuleCompressionLoaded', true)
  }
  catch {
    console.warn('[nuxt-feathers-zod] server module "compression" skipped for Koa: install koa-compress in the host app to enable it.')
  }
}
