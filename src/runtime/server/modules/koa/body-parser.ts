export default async function bodyParserServerModule(app: any, ctx: any = {}) {
  const options = ctx.moduleOptions
  if (options === false)
    return

  const framework = ctx?.transports?.rest?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  if (!app?.use)
    return

  const mod = await import('@feathersjs/koa')
  const bodyParser = (mod as any).bodyParser
  if (typeof bodyParser !== 'function')
    return

  app.use(bodyParser(options === true || options === undefined ? undefined : options))
  app.set?.('nfzModuleBodyParserLoaded', true)
}
