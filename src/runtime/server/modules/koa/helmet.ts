export default async function helmetServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions === undefined ? true : ctx.moduleOptions
  if (options === false)
    return

  const framework = ctx?.transports?.rest?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  if (!app?.use)
    return

  try {
    const mod = await import('koa-helmet')
    const helmet = (mod as any).default ?? mod
    app.use(helmet(options === true ? undefined : options))
    app.set?.('nfzModuleHelmetLoaded', true)
  }
  catch {
    console.warn('[nuxt-feathers-zod] server module "helmet" skipped for Koa: install koa-helmet in the host app to enable it.')
  }
}
