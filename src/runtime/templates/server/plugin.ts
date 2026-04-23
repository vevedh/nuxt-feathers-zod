import type { Import } from 'unimport'
import type { ResolvedOptions } from '../../options'
import type { DefaultAuthOptions } from '../../options/authentication'
import type { ServicesDirs } from '../../options/services'
import type { RestOptions } from '../../options/transports/rest'
import type { WebsocketOptions } from '../../options/transports/websocket'

import { scanDirExports } from 'unimport'

import { filterExports, setImportsMeta } from '../../options/utils'
import { put } from '../utils'

async function getServices(servicesDirs: ServicesDirs): Promise<Import[]> {
  const services = await scanDirExports(servicesDirs, {
    filePatterns: ['**/*.ts'],
    types: false,
  })

  return services
    .filter(({ from }) => !/\w+\.\w+\.ts$/.test(from))
    .filter(filterExports)
}

function toNamedRegistrars(imports: any[], kind: 'service' | 'plugin'): string {
  if (!imports.length)
    return '[]'

  return `[\n${imports.map(item => `  { handler: ${item.meta.importId}, label: ${JSON.stringify(`${kind} ${item.name || item.as || item.meta.importId}`)} }`).join(',\n')}\n]`
}

function toNamedModules(imports: any[]): string {
  if (!imports.length)
    return '[]'

  return `[\n${imports.map(item => `  { handler: ${item.meta.importId}, label: ${JSON.stringify(`module ${item.name || item.as || item.meta.importId}`)}, moduleOptions: ${JSON.stringify(item.options ?? null)} }`).join(',\n')}\n]`
}

function normalizePath(value: string): string {
  if (!value)
    return ''
  return value.startsWith('/') ? value : `/${value}`
}

function trimTrailingSlash(value: string): string {
  if (!value)
    return ''
  return value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value
}

function buildRouterBlock({ koa, exp, sio, restPath }: { koa: boolean, exp: boolean, sio: boolean, restPath: string | undefined }): string {
  const lines: string[] = []

  if (koa)
    lines.push(`  createKoaRouter(app, ${JSON.stringify(restPath)})`)
  if (exp)
    lines.push(`  createExpressRouter(app, ${JSON.stringify(restPath)})`)
  if (sio)
    lines.push('  createSocketIoRouter(app)')

  if (!lines.length)
    lines.push('  return app')

  return `const nfzCreateRouters = (app) => {\n${lines.join('\n')}\n}\n`
}

export function getServerPluginContents(options: ResolvedOptions) {
  return async (): Promise<string> => {
    const services = setImportsMeta(await getServices(options.servicesDirs))
    const plugins = options.server.plugins
    const serverModules = options.server.modules
    const loadOrder = ((options.server as any)?.loadOrder || ['modules:pre', 'plugins', 'services', 'modules:post']) as string[]
    const preModules = serverModules.filter(m => (m as any).phase !== 'post')
    const postModules = serverModules.filter(m => (m as any).phase === 'post')
    const modules = [...services, ...plugins, ...serverModules]

    const transports = options?.transports
    const rest = Boolean(transports?.rest)
    const framework = (transports?.rest as RestOptions)?.framework
    const exp = framework === 'express'
    const koa = framework === 'koa'
    const sio = Boolean(transports?.websocket)

    const authStrategies = (options?.auth as DefaultAuthOptions)?.authStrategies
    const auth = (authStrategies || []).length > 0

    const keycloakEnabled = Boolean(options.keycloak)
    const keycloak = options.keycloak as any

    const restPath = (transports?.rest as RestOptions)?.path
    const websocketOptions = (transports?.websocket as WebsocketOptions) || undefined
    const websocketPath = websocketOptions?.path

    const swaggerEnabled = Boolean(options.swagger)
    const swagger = options.swagger as any
    const docsPath = trimTrailingSlash(normalizePath(swagger?.docsPath ?? '/docs'))
    const docsJsonPath = trimTrailingSlash(normalizePath(swagger?.docsJsonPath ?? '/docs.json'))

    const routers = [exp && 'createExpressRouter', koa && 'createKoaRouter', sio && 'createSocketIoRouter'].filter(Boolean).join(', ')

    const swaggerInitBlock = swaggerEnabled
      ? `const nfzInitSwagger = async (app) => {
  app.configure(swagger.customMethodsHandler)
  app.configure(swagger({
    docsPath: ${JSON.stringify(docsPath)},
    docsJsonPath: ${JSON.stringify(docsJsonPath)},
    specs: {
      info: ${JSON.stringify(swagger?.info ?? { title: 'API Docs', description: 'Feathers API', version: '1.0.0' })},
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ BearerAuth: [] }],
    },
    ui: swagger.swaggerUI({ docsPath: ${JSON.stringify(docsPath)} }),
  }))
}
`
      : 'const nfzInitSwagger = undefined\n'

    const keycloakInitBlock = keycloakEnabled
      ? `const nfzKeycloakConfig = ${JSON.stringify({
          serverUrl: keycloak.serverUrl,
          realm: keycloak.realm,
          clientId: keycloak.clientId,
          issuer: keycloak.issuer || `${keycloak.serverUrl.replace(/\/$/, '')}/realms/${keycloak.realm}`,
          audience: keycloak.audience || keycloak.clientId,
          secret: keycloak.secret,
          userService: keycloak.userService || 'users',
          serviceIdField: keycloak.serviceIdField || 'keycloakId',
          authServicePath: keycloak.authServicePath || '/_keycloak',
          permissions: Boolean(keycloak.permissions),
        }, null, 2)}
const nfzInitKeycloak = async (app) => {
  await setupKeycloakBridge(app, nfzKeycloakConfig)
}
`
      : 'const nfzInitKeycloak = undefined\n'

    const configLiteral = JSON.stringify({
      transports: {
        rest: rest ? { enabled: true, framework, path: restPath } : false,
        websocket: sio ? { enabled: true, ...(websocketOptions || {}), path: websocketPath ?? '/socket.io' } : false,
      },
      loadFeathersConfig: Boolean(options.loadFeathersConfig),
      auth: { enabled: auth },
      server: {
        secureDefaults: (options.server as any)?.secureDefaults,
        secure: (options.server as any)?.secure,
      },
      database: {
        mongo: options.database?.mongo
          ? {
              enabled: true,
              url: options.database.mongo.url || null,
              management: options.database.mongo.management || null,
            }
          : false,
      },
    }, null, 2)

    return `// ! Generated by nuxt-feathers-zod - do not change manually
${put(keycloakEnabled, `import { setupKeycloakBridge } from './keycloak'`)}
import { createServerBootstrap } from 'nuxt-feathers-zod/server-bootstrap'
import { createFeathersApp, configureFeathersInfrastructure } from './app'
${put(swaggerEnabled, `import swagger from 'feathers-swagger'`)}
${put(exp, `import { expressErrorHandler } from '@gabortorma/feathers-nitro-adapter/handlers'`)}
${put(Boolean(routers), `import { ${routers} } from '@gabortorma/feathers-nitro-adapter/routers'`)}
import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'
${modules.map(module => module.meta.import).join('\n')}

const nfzServerConfig = ${configLiteral}
const nfzServices = ${toNamedRegistrars(services, 'service')}
const nfzPlugins = ${toNamedRegistrars(plugins, 'plugin')}
const nfzPreModules = ${toNamedModules(preModules)}
const nfzPostModules = ${toNamedModules(postModules)}
${swaggerInitBlock}${keycloakInitBlock}${buildRouterBlock({ koa, exp, sio, restPath })}
export default defineNitroPlugin(createServerBootstrap({
  config: nfzServerConfig,
  createApp: createFeathersApp,
  configureInfrastructure: configureFeathersInfrastructure,
  initSwagger: nfzInitSwagger,
  initKeycloak: nfzInitKeycloak,
  expressErrorHandler: ${exp ? 'expressErrorHandler' : 'undefined'},
  createRouters: nfzCreateRouters,
  loadOrder: ${JSON.stringify(loadOrder)},
  preModules: nfzPreModules,
  postModules: nfzPostModules,
  plugins: nfzPlugins,
  services: nfzServices,
}))
`
  }
}
