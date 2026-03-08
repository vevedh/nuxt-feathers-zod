export default async function secureDefaultsServerModule(app: any, ctx: any = {}) {
  if (ctx?.moduleOptions === false)
    return

  const framework = ctx?.transports?.rest?.framework || ctx?.framework || app?.get?.('framework')
  if (framework && framework !== 'koa')
    return

  const server = ctx?.server || {}
  const enabled = server.secureDefaults !== false
  const secure = { ...(server.secure || {}), ...(ctx?.moduleOptions || {}) }

  if (!app?.use)
    return

  const feathersKoa = await import('@feathersjs/koa')
  const bodyParser = (feathersKoa as any).bodyParser

  const bp = secure.bodyParser || {}
  const jsonOpt = bp.json
  const urlOpt = bp.urlencoded
  const bodyParserEnabled = enabled
    ? (jsonOpt !== false || urlOpt !== false)
    : ((jsonOpt && jsonOpt !== false) || (urlOpt && urlOpt !== false))

  if (bodyParserEnabled && typeof bodyParser === 'function') {
    const mergedBodyParserOptions = {
      ...(typeof jsonOpt === 'object' ? jsonOpt : {}),
      ...(typeof urlOpt === 'object' ? urlOpt : {}),
    }
    app.use(bodyParser(Object.keys(mergedBodyParserOptions).length ? mergedBodyParserOptions : undefined))
  }

  if (!enabled)
    return

  const corsOpt = secure.cors
  if (corsOpt) {
    try {
      const mod = await import('@koa/cors')
      const cors = (mod as any).default ?? mod
      app.use(cors(typeof corsOpt === 'object' ? corsOpt : undefined))
    }
    catch {
      console.warn('[nuxt-feathers-zod] server module "secure-defaults" skipped Koa CORS: install @koa/cors in the host app to enable it.')
    }
  }

  const helmetOpt = secure.helmet
  if (helmetOpt) {
    try {
      const mod = await import('koa-helmet')
      const helmet = (mod as any).default ?? mod
      app.use(helmet(typeof helmetOpt === 'object' ? helmetOpt : undefined))
    }
    catch {
      console.warn('[nuxt-feathers-zod] server module "secure-defaults" skipped Koa helmet: install koa-helmet in the host app to enable it.')
    }
  }

  const compressionOpt = secure.compression
  if (compressionOpt) {
    try {
      const mod = await import('koa-compress')
      const compression = (mod as any).default ?? mod
      app.use(compression(typeof compressionOpt === 'object' ? compressionOpt : undefined))
    }
    catch {
      console.warn('[nuxt-feathers-zod] server module "secure-defaults" skipped Koa compression: install koa-compress in the host app to enable it.')
    }
  }

  const serveStaticOpt = secure.serveStatic
  if (serveStaticOpt && serveStaticOpt !== false) {
    const staticPath = (typeof serveStaticOpt === 'object' && serveStaticOpt.path) ? String(serveStaticOpt.path) : '/'
    const staticDir = (typeof serveStaticOpt === 'object' && serveStaticOpt.dir) ? String(serveStaticOpt.dir) : 'public'
    try {
      const mod = await import('koa-static')
      const koaStatic = (mod as any).default ?? mod
      app.use(async (koaCtx: any, next: any) => {
        if (staticPath !== '/' && !String(koaCtx.path || '').startsWith(staticPath))
          return next()
        return koaStatic(staticDir)(koaCtx, next)
      })
    }
    catch {
      console.warn('[nuxt-feathers-zod] server module "secure-defaults" skipped Koa static: install koa-static in the host app to enable it.')
    }
  }

  app.set?.('nfzModuleSecureDefaultsLoaded', true)
}
