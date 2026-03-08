export default async function secureDefaultsServerModule(app: any, ctx: any = {}) {
  if (ctx?.moduleOptions === false)
    return

  const framework = ctx?.transports?.rest?.framework || ctx?.framework || app?.get?.('framework')
  if (framework && framework !== 'express')
    return

  const server = ctx?.server || {}
  const enabled = server.secureDefaults !== false
  const secure = { ...(server.secure || {}), ...(ctx?.moduleOptions || {}) }

  const expressApp = typeof app?.getApp === 'function' ? app.getApp() : app
  if (!expressApp?.use)
    return

  const feathersExpress = await import('@feathersjs/express')
  const json = (feathersExpress as any).json
  const urlencoded = (feathersExpress as any).urlencoded
  const serveStatic = (feathersExpress as any).serveStatic

  const bp = secure.bodyParser || {}
  const jsonOpt = bp.json
  const urlOpt = bp.urlencoded
  const enableJson = enabled ? (jsonOpt !== false) : (jsonOpt && jsonOpt !== false)
  const enableUrl = enabled ? (urlOpt !== false) : (urlOpt && urlOpt !== false)

  if (enableJson)
    expressApp.use(json(typeof jsonOpt === 'object' ? jsonOpt : undefined))
  if (enableUrl)
    expressApp.use(urlencoded(typeof urlOpt === 'object' ? urlOpt : { extended: true }))

  if (!enabled)
    return

  const corsOpt = secure.cors
  if (corsOpt) {
    try {
      const mod = await import('cors')
      const cors = (mod as any).default ?? mod
      expressApp.use(cors(typeof corsOpt === 'object' ? corsOpt : undefined))
    }
    catch {
      console.warn('[nuxt-feathers-zod] server module "secure-defaults" skipped CORS: install cors in the host app to enable it.')
    }
  }

  const helmetOpt = secure.helmet
  if (helmetOpt) {
    try {
      const mod = await import('helmet')
      const helmet = (mod as any).default ?? mod
      expressApp.use(helmet(typeof helmetOpt === 'object' ? helmetOpt : undefined))
    }
    catch {
      console.warn('[nuxt-feathers-zod] server module "secure-defaults" skipped helmet: install helmet in the host app to enable it.')
    }
  }

  const compressionOpt = secure.compression
  if (compressionOpt) {
    try {
      const mod = await import('compression')
      const compression = (mod as any).default ?? mod
      expressApp.use(compression(typeof compressionOpt === 'object' ? compressionOpt : undefined))
    }
    catch {
      console.warn('[nuxt-feathers-zod] server module "secure-defaults" skipped compression: install compression in the host app to enable it.')
    }
  }

  const serveStaticOpt = secure.serveStatic
  if (serveStaticOpt && serveStaticOpt !== false) {
    const staticPath = (typeof serveStaticOpt === 'object' && serveStaticOpt.path) ? serveStaticOpt.path : '/'
    const staticDir = (typeof serveStaticOpt === 'object' && serveStaticOpt.dir) ? serveStaticOpt.dir : 'public'
    expressApp.use(staticPath, serveStatic(staticDir))
  }

  app.set('nfzModuleSecureDefaultsLoaded', true)
}
