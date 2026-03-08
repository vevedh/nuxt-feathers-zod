export default async function corsServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions === undefined ? true : ctx.moduleOptions
  if (options === false)
    return

  const framework = ctx?.transports?.rest?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  if (!app?.use)
    return

  try {
    const mod = await import('@koa/cors')
    const cors = (mod as any).default ?? mod
    app.use(cors(options === true ? undefined : options))
    app.set?.('nfzModuleCorsLoaded', true)
  }
  catch {
    console.warn('[nuxt-feathers-zod] server module "cors" skipped for Koa: install @koa/cors in the host app to enable it.')
  }
}
