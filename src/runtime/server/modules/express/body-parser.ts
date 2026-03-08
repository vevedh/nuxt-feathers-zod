export default async function bodyParserServerModule(app: any, ctx: any = {}) {
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
  const json = (mod as any).json
  const urlencoded = (mod as any).urlencoded

  const jsonOptions = options && typeof options === 'object' ? options.json : undefined
  const urlencodedOptions = options && typeof options === 'object' ? options.urlencoded : undefined

  if (jsonOptions !== false)
    expressApp.use(json(jsonOptions === true || jsonOptions === undefined ? undefined : jsonOptions))

  if (urlencodedOptions !== false)
    expressApp.use(
      urlencoded(
        urlencodedOptions === true || urlencodedOptions === undefined
          ? { extended: true }
          : urlencodedOptions,
      ),
    )

  app.set('nfzModuleBodyParserLoaded', true)
}
