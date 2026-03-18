import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

import { defineCommand, runMain } from 'citty'
import consola from 'consola'

import { getMongoManagementRoutes, normalizeMongoManagementBasePath } from '../runtime/options/database/mongodb'

import type { Adapter, IdField, MiddlewareTarget, RunCliOptions, SchemaKind } from './core'
import { detectFeathersPlugins, detectServerModules, runDoctor } from './commands/doctor'
import {
  findProjectRoot,
  generateCustomService,
  generateMiddleware,
  generateMongoCompose,
  generateService,
  toggleServiceAuth,
  handleCliError,
  initTemplates,
  printHelp,
  setServiceSchemaMode,
  showServiceSchema,
  mutateServiceFields,
  validateServiceSchema,
  repairAuthServiceSchema,
  tryPatchNuxtConfig,
} from './core'

export type { RunCliOptions } from './core'
export { generateCustomService, generateMiddleware, generateService } from './core'

function parseBooleanFlag(value: string | boolean | undefined, fallback: boolean): boolean {
  if (value === undefined)
    return fallback
  if (typeof value === 'boolean')
    return value
  const normalized = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized))
    return true
  if (['false', '0', 'no', 'off'].includes(normalized))
    return false
  return fallback
}


function resolveBooleanCliArg(rawArgs: string[] | undefined, flagName: string, parsedValue: string | boolean | undefined, fallback: boolean): boolean {
  if (Array.isArray(rawArgs)) {
    const longFlag = `--${flagName}`
    const idx = rawArgs.findIndex(arg => arg === longFlag)
    if (idx >= 0) {
      const next = rawArgs[idx + 1]
      if (typeof next === 'string' && !next.startsWith('-'))
        return parseBooleanFlag(next, fallback)
      return true
    }

    const inline = rawArgs.find(arg => arg.startsWith(`${longFlag}=`))
    if (typeof inline === 'string')
      return parseBooleanFlag(inline.slice(longFlag.length + 1), fallback)
  }

  return parseBooleanFlag(parsedValue, fallback)
}

function parseNumberFlag(value: string | boolean | undefined): number | undefined {
  if (typeof value !== 'string')
    return undefined
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

function parseCsvFlag(value: string | boolean | undefined): string[] | undefined {
  if (typeof value !== 'string')
    return undefined
  const items = value.split(',').map(v => v.trim()).filter(Boolean)
  return items.length ? items : undefined
}

function parseCorsOriginFlag(value: string | boolean | undefined): boolean | string | string[] | undefined {
  if (value === undefined)
    return undefined
  if (typeof value === 'boolean')
    return value
  const normalized = String(value).trim()
  const lowered = normalized.toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(lowered))
    return true
  if (['false', '0', 'no', 'off'].includes(lowered))
    return false
  if (normalized.includes(','))
    return normalized.split(',').map(v => v.trim()).filter(Boolean)
  return normalized
}

function parseWebsocketOptions(args: Record<string, unknown>) {
  const connectTimeout = parseNumberFlag(args.websocketConnectTimeout as string | boolean | undefined)
  const transports = parseCsvFlag(args.websocketTransports as string | boolean | undefined)
  const corsOrigin = parseCorsOriginFlag(args.websocketCorsOrigin as string | boolean | undefined)
  const corsCredentials = args.websocketCorsCredentials === undefined
    ? undefined
    : parseBooleanFlag(args.websocketCorsCredentials as string | boolean | undefined, false)
  const corsMethods = parseCsvFlag(args.websocketCorsMethods as string | boolean | undefined)

  const websocket: {
    connectTimeout?: number
    transports?: string[]
    cors?: {
      origin?: boolean | string | string[]
      credentials?: boolean
      methods?: string[]
    }
  } = {}

  if (connectTimeout !== undefined)
    websocket.connectTimeout = connectTimeout
  if (transports?.length)
    websocket.transports = transports

  if (corsOrigin !== undefined || corsCredentials !== undefined || corsMethods?.length) {
    websocket.cors = {}
    if (corsOrigin !== undefined)
      websocket.cors.origin = corsOrigin
    if (corsCredentials !== undefined)
      websocket.cors.credentials = corsCredentials
    if (corsMethods?.length)
      websocket.cors.methods = corsMethods
  }

  return Object.keys(websocket).length ? websocket : undefined
}

type CliContextArgs = Record<string, unknown> & { _: string[] }

function hasDefinedFlag(args: Record<string, unknown>, key: string) {
  return args[key] !== undefined
}

export function assertServiceGenerationArgs(args: CliContextArgs, custom: boolean, adapter: Adapter) {
  const hasCollection = typeof args.collection === 'string' && String(args.collection).trim().length > 0
  const hasMethods = typeof args.methods === 'string' && String(args.methods).trim().length > 0
  const hasCustomMethods = typeof args.customMethods === 'string' && String(args.customMethods).trim().length > 0
  const hasIdField = hasDefinedFlag(args, 'idField')

  if (custom) {
    if (adapter !== 'memory')
      throw new Error('Invalid flags for `add service --custom`: --adapter is not supported for adapter-less custom services.')
    if (hasCollection)
      throw new Error('Invalid flags for `add service --custom`: --collection is only valid with --adapter mongodb.')
    if (hasIdField)
      throw new Error('Invalid flags for `add service --custom`: --idField is not used by adapter-less custom services.')
    return
  }

  if (hasMethods || hasCustomMethods) {
    throw new Error('Invalid flags for `add service`: --methods and --customMethods are only supported with --custom.')
  }

  if (hasCollection && adapter !== 'mongodb') {
    throw new Error('Invalid flags for `add service`: --collection requires --adapter mongodb.')
  }
}

export function assertInitRemoteArgs(args: CliContextArgs, transport: 'auto' | 'rest' | 'socketio', authEnabled: boolean) {
  const websocketRelated = [
    'websocketPath',
    'websocketTransports',
    'websocketConnectTimeout',
    'websocketCorsOrigin',
    'websocketCorsCredentials',
    'websocketCorsMethods',
  ]
  const hasWebsocketFlags = websocketRelated.some(key => hasDefinedFlag(args, key))
  if (transport === 'rest' && hasWebsocketFlags) {
    throw new Error('Invalid flags for `init remote`: websocket options are not supported when --transport rest is used.')
  }

  const authRelated = ['payloadMode', 'strategy', 'tokenField', 'servicePath', 'reauth']
  const hasAuthFlags = authRelated.some(key => hasDefinedFlag(args, key))
  if (!authEnabled && hasAuthFlags) {
    throw new Error('Invalid flags for `init remote`: auth options require --auth true.')
  }
}

export function assertInitEmbeddedArgs(args: CliContextArgs, framework: 'express' | 'koa', serveStaticEnabled: boolean, serverModulesPreset?: string) {
  if (!serveStaticEnabled && (hasDefinedFlag(args, 'serveStaticPath') || hasDefinedFlag(args, 'serveStaticDir'))) {
    throw new Error('Invalid flags for `init embedded`: --serveStaticPath/--serveStaticDir require --serveStatic true.')
  }

  if (framework === 'koa' && serverModulesPreset === 'express-baseline') {
    throw new Error('Invalid flags for `init embedded`: express-baseline preset is only available with --framework express.')
  }
}

async function withProjectRoot(cwd: string) {
  const resolved = resolve(cwd)
  try {
    return await findProjectRoot(resolved)
  }
  catch {
    return resolved
  }
}

async function handleDoctorCommand(cwd: string) {
  const projectRoot = await withProjectRoot(cwd)
  await runDoctor(projectRoot)
}

async function handleRemoteAuthKeycloakCommand(cwd: string, args: CliContextArgs) {
  const projectRoot = await withProjectRoot(cwd)
  const dry = Boolean(args.dry)

  const ssoUrl = typeof args.ssoUrl === 'string'
    ? String(args.ssoUrl)
    : (typeof args.url === 'string' ? String(args.url) : '')
  const realm = typeof args.realm === 'string' ? String(args.realm) : ''
  const clientId = typeof args.clientId === 'string' ? String(args.clientId) : ''

  if (!ssoUrl || !realm || !clientId)
    throw new Error('Missing required flags: --ssoUrl <url> --realm <realm> --clientId <id>')

  await tryPatchNuxtConfig(projectRoot, {
    clientMode: 'remote',
    remote: {
      url: '',
      auth: {
        enabled: true,
        payloadMode: 'keycloak',
        strategy: 'jwt',
        tokenField: 'accessToken',
        servicePath: 'authentication',
        reauth: true,
      },
    },
    keycloak: {
      serverUrl: ssoUrl,
      realm,
      clientId,
      onLoad: 'check-sso',
    },
  }, { dry })
}

async function handleAuthServiceCommand(cwd: string, args: CliContextArgs) {
  const name = typeof args.name === 'string' ? String(args.name) : ''
  if (!name)
    throw new Error('Missing <name>.')

  const projectRoot = await withProjectRoot(cwd)
  const servicesDirName = typeof args.servicesDir === 'string' ? String(args.servicesDir) : 'services'
  const enabled = parseBooleanFlag(args.enabled as string | boolean | undefined, true)
  const dry = Boolean(args.dry)

  await toggleServiceAuth({
    projectRoot,
    servicesDir: resolve(projectRoot, servicesDirName),
    name,
    enabled,
    dry,
  })
}

async function handleInitTemplatesCommand(cwd: string, args: CliContextArgs) {
  const projectRoot = await withProjectRoot(cwd)
  const dry = Boolean(args.dry)
  const dir = typeof args.dir === 'string' ? String(args.dir) : 'feathers/templates'
  const force = Boolean(args.force)
  await initTemplates({ projectRoot, outDir: resolve(projectRoot, dir), force, dry })
  await tryPatchNuxtConfig(projectRoot, { templatesDir: dir }, { dry })
}

async function handleInitEmbeddedCommand(cwd: string, args: CliContextArgs) {
  const projectRoot = await withProjectRoot(cwd)
  const dry = Boolean(args.dry)
  const servicesDir = typeof args.servicesDir === 'string' ? String(args.servicesDir) : 'services'
  const framework = (typeof args.framework === 'string' ? String(args.framework) : 'express') as 'express' | 'koa'
  const restPath = typeof args.restPath === 'string' ? String(args.restPath) : '/feathers'
  const websocketPath = typeof args.websocketPath === 'string' ? String(args.websocketPath) : '/socket.io'
  const websocket = parseWebsocketOptions(args)
  const secureDefaults = parseBooleanFlag(args.secureDefaults as string | boolean | undefined, true)
  const enableAuth = parseBooleanFlag(args.auth as string | boolean | undefined, false)
  const enableSwagger = parseBooleanFlag(args.swagger as string | boolean | undefined, false)
  const serveStaticEnabled = parseBooleanFlag(args.serveStatic as string | boolean | undefined, false)
  const serverModulesPreset = typeof args.serverModulesPreset === 'string'
    ? String(args.serverModulesPreset)
    : (args.expressBaseline ? 'express-baseline' : undefined)

  assertInitEmbeddedArgs(args, framework, serveStaticEnabled, serverModulesPreset)

  if (serverModulesPreset === 'express-baseline') {
    await generateMiddleware({
      projectRoot,
      name: 'express-baseline',
      target: 'server-module',
      dry,
      force: Boolean(args.force),
      preset: 'express-baseline',
    })
  }

  await tryPatchNuxtConfig(projectRoot, {
    clientMode: 'embedded',
    servicesDir,
    ensureServerModuleDir: serverModulesPreset ? 'server/feathers/modules' : undefined,
    embedded: {
      framework,
      restPath,
      websocketPath,
      websocket,
      secureDefaults,
      auth: enableAuth,
      swagger: enableSwagger,
      secure: {
        cors: parseBooleanFlag(args.cors as string | boolean | undefined, true),
        compression: parseBooleanFlag(args.compression as string | boolean | undefined, true),
        helmet: parseBooleanFlag(args.helmet as string | boolean | undefined, true),
        bodyParser: {
          json: parseBooleanFlag(args.bodyParserJson as string | boolean | undefined, true),
          urlencoded: parseBooleanFlag(args.bodyParserUrlencoded as string | boolean | undefined, true),
        },
        serveStatic: serveStaticEnabled
          ? {
              path: typeof args.serveStaticPath === 'string' ? String(args.serveStaticPath) : '/',
              dir: typeof args.serveStaticDir === 'string' ? String(args.serveStaticDir) : 'public',
            }
          : false,
      },
    },
  }, { dry })
}

async function handleInitRemoteCommand(cwd: string, args: CliContextArgs) {
  const projectRoot = await withProjectRoot(cwd)
  const dry = Boolean(args.dry)
  const remoteUrl = typeof args.url === 'string' ? String(args.url) : ''
  const transport = (typeof args.transport === 'string' ? String(args.transport) : 'socketio') as 'auto' | 'rest' | 'socketio'
  const restPath = typeof args.restPath === 'string' ? String(args.restPath) : '/feathers'
  const websocketPath = typeof args.websocketPath === 'string' ? String(args.websocketPath) : '/socket.io'
  const websocket = parseWebsocketOptions(args)

  if (!remoteUrl)
    throw new Error('Missing required flag: --url <http(s)://...>')

  const authEnabled = parseBooleanFlag(args.auth as string | boolean | undefined, false)
  assertInitRemoteArgs(args, transport, authEnabled)
  const payloadMode = (typeof args.payloadMode === 'string' ? String(args.payloadMode) : 'jwt') as 'jwt' | 'keycloak'
  const strategy = typeof args.strategy === 'string' ? String(args.strategy) : 'jwt'
  const tokenField = typeof args.tokenField === 'string' ? String(args.tokenField) : 'accessToken'
  const servicePath = typeof args.servicePath === 'string' ? String(args.servicePath) : 'authentication'
  const reauth = parseBooleanFlag(args.reauth as string | boolean | undefined, true)

  await tryPatchNuxtConfig(projectRoot, {
    clientMode: 'remote',
    remote: {
      url: remoteUrl,
      transport,
      restPath,
      websocketPath,
      websocket,
      auth: authEnabled
        ? { enabled: true, payloadMode, strategy, tokenField, servicePath, reauth }
        : { enabled: false },
    },
  }, { dry })
}

async function handleAddMongoComposeCommand(cwd: string, args: CliContextArgs) {
  const projectRoot = await withProjectRoot(cwd)
  const dry = Boolean(args.dry)
  const force = Boolean(args.force)
  const outFile = typeof args.out === 'string' ? String(args.out) : 'docker-compose-db.yaml'
  const serviceName = typeof args.service === 'string' ? String(args.service) : 'mongodb'
  const port = parseNumberFlag(args.port as string | boolean | undefined)
  const database = typeof args.database === 'string' ? String(args.database) : 'app'
  const rootUser = typeof args.rootUser === 'string' ? String(args.rootUser) : 'root'
  const rootPassword = typeof args.rootPassword === 'string' ? String(args.rootPassword) : 'change-me'
  const volume = typeof args.volume === 'string' ? String(args.volume) : 'mongodb_data'

  await generateMongoCompose({
    projectRoot,
    outFile,
    serviceName,
    port,
    database,
    rootUser,
    rootPassword,
    volume,
    dry,
    force,
  })
}

async function handleAddServiceCommand(cwd: string, args: CliContextArgs, compatibilityAlias = false) {
  const name = typeof args.name === 'string' ? String(args.name) : ''
  if (!name)
    throw new Error('Missing <name>.')

  const adapter = (args.adapter as Adapter | undefined) ?? 'memory'
  const auth = parseBooleanFlag(args.auth as string | boolean | undefined, false)
  const custom = compatibilityAlias
    || parseBooleanFlag(args.custom as string | boolean | undefined, false)
    || args.type === 'custom'
    || typeof args.customMethods === 'string'
  assertServiceGenerationArgs(args, custom, adapter)
  const idField = (args.idField as IdField | undefined) ?? (adapter === 'mongodb' ? '_id' : 'id')
  const servicePath = typeof args.path === 'string' ? String(args.path) : undefined
  const collectionName = typeof args.collection === 'string' ? String(args.collection) : undefined
  const methods = typeof args.methods === 'string' ? String(args.methods) : undefined
  const customMethods = typeof args.customMethods === 'string' ? String(args.customMethods) : undefined
  const docs = parseBooleanFlag(args.docs as string | boolean | undefined, false)
  const authAware = args.authAware === undefined ? undefined : parseBooleanFlag(args.authAware as string | boolean | undefined, false)
  const schema = (args.schema as SchemaKind | undefined) ?? 'none'
  const dry = parseBooleanFlag(args.dry as string | boolean | undefined, false)
  const force = parseBooleanFlag(args.force as string | boolean | undefined, false)
  const diff = parseBooleanFlag(args.diff as string | boolean | undefined, false)
  const projectRoot = await withProjectRoot(cwd)
  const servicesDirName = typeof args.servicesDir === 'string' ? String(args.servicesDir) : 'services'
  const servicesDir = resolve(projectRoot, servicesDirName)

  if (compatibilityAlias && !dry)
    consola.warn('[nfz] `add custom-service` is kept as a compatibility alias. Prefer `add service <name> --custom`.')

  await generateService({
    projectRoot,
    servicesDir,
    name,
    adapter,
    auth,
    idField,
    servicePath,
    collectionName,
    docs,
    authAware,
    schema,
    dry,
    force,
    custom,
    methods,
    customMethods,
  })
  await tryPatchNuxtConfig(projectRoot, { servicesDir: servicesDirName }, { dry })
}

async function handleAddServerModuleCommand(cwd: string, args: CliContextArgs) {
  const name = typeof args.name === 'string' ? String(args.name) : ''
  if (!name)
    throw new Error('Missing <name>.')

  const dry = Boolean(args.dry)
  const force = Boolean(args.force)
  const preset = typeof args.preset === 'string' ? String(args.preset) : undefined
  const projectRoot = await withProjectRoot(cwd)

  await generateMiddleware({
    projectRoot,
    name,
    target: 'server-module',
    dry,
    force,
    preset,
  })

  await tryPatchNuxtConfig(projectRoot, { ensureServerModuleDir: 'server/feathers/modules' }, { dry })
}

async function handleAddRemoteServiceCommand(cwd: string, args: CliContextArgs) {
  const name = typeof args.name === 'string' ? String(args.name) : ''
  if (!name)
    throw new Error('Missing <name>.')

  const dry = Boolean(args.dry)
  const projectRoot = await withProjectRoot(cwd)
  const methods = typeof args.methods === 'string'
    ? String(args.methods).split(',').map(s => s.trim()).filter(Boolean)
    : undefined
  const path = typeof args.path === 'string' ? String(args.path) : name

  await tryPatchNuxtConfig(projectRoot, {
    clientMode: 'remote',
    remoteService: { path, methods },
  }, { dry })
}

async function handleAddMiddlewareCommand(cwd: string, args: CliContextArgs) {
  const name = typeof args.name === 'string' ? String(args.name) : ''
  if (!name)
    throw new Error('Missing <name>.')

  const target = (args.target as MiddlewareTarget | undefined) ?? 'nitro'
  const dry = Boolean(args.dry)
  const force = Boolean(args.force)
  const projectRoot = await withProjectRoot(cwd)

  await generateMiddleware({
    projectRoot,
    name,
    target,
    dry,
    force,
  })

  if (target === 'feathers')
    await tryPatchNuxtConfig(projectRoot, { ensureServerFeathersPluginsDir: true }, { dry })

  if (target === 'server-module' || target === 'module')
    await tryPatchNuxtConfig(projectRoot, { ensureServerModuleDir: 'server/feathers/modules' }, { dry })
}


async function handleSchemaCommand(cwd: string, args: CliContextArgs) {
  const name = typeof args.name === 'string' ? String(args.name) : ''
  if (!name)
    throw new Error('Missing <service>.')

  const projectRoot = await withProjectRoot(cwd)
  const servicesDirName = typeof args.servicesDir === 'string' ? String(args.servicesDir) : 'services'
  const servicesDir = resolve(projectRoot, servicesDirName)
  const dry = parseBooleanFlag(args.dry as string | boolean | undefined, false)
  const force = parseBooleanFlag(args.force as string | boolean | undefined, false)
  const diff = parseBooleanFlag(args.diff as string | boolean | undefined, false)
  const setMode = typeof args.setMode === 'string'
    ? String(args.setMode) as SchemaKind
    : (typeof (args as any)['set-mode'] === 'string' ? String((args as any)['set-mode']) as SchemaKind : undefined)
  const show = Boolean(args.show) || Boolean(args.get)
  const json = Boolean(args.json)
  const exportFile = args.export ? `services/.nfz/exports/${name}.schema.${json ? 'json' : 'txt'}` : undefined
  const addField = typeof args.addField === 'string'
    ? String(args.addField)
    : (typeof (args as any)['add-field'] === 'string' ? String((args as any)['add-field']) : undefined)
  const validate = Boolean((args as any).validate)
  const repairAuth = Boolean((args as any).repairAuth) || Boolean((args as any)['repair-auth'])
  const removeField = typeof args.removeField === 'string'
    ? String(args.removeField)
    : (typeof (args as any)['remove-field'] === 'string' ? String((args as any)['remove-field']) : undefined)
  const setField = typeof args.setField === 'string'
    ? String(args.setField)
    : (typeof (args as any)['set-field'] === 'string' ? String((args as any)['set-field']) : undefined)
  const renameField = typeof args.renameField === 'string'
    ? String(args.renameField)
    : (typeof (args as any)['rename-field'] === 'string' ? String((args as any)['rename-field']) : undefined)

  if (setMode)
    await setServiceSchemaMode({ projectRoot, servicesDir, name, mode: setMode, dry, force, diff })

  if (addField || removeField || setField || renameField)
    await mutateServiceFields({ projectRoot, servicesDir, name, addField, removeField, setField, renameField, dry, force, diff })

  if (repairAuth)
    await repairAuthServiceSchema({ projectRoot, servicesDir, name, dry, diff, force })

  if (validate)
    await validateServiceSchema({ projectRoot, servicesDir, name, format: json ? 'json' : 'show' })

  const hasMutation = Boolean(setMode || addField || removeField || setField || renameField || repairAuth)
  const hasView = Boolean(show || args.get || json || exportFile)

  if (!hasMutation && validate && !hasView)
    return

  if (args.get)
    consola.warn('[nfz] `schema --get` is a compatibility alias. Prefer `schema --show`.')

  if (hasView) {
    await showServiceSchema({
      projectRoot,
      servicesDir,
      name,
      format: json ? 'json' : 'show',
      exportFile,
    })
    return
  }

  if (!hasMutation)
    await showServiceSchema({ projectRoot, servicesDir, name, format: 'show' })
}



async function listTsFiles(dir: string, filter?: (name: string) => boolean) {
  if (!existsSync(dir))
    return [] as string[]
  const entries = await readdir(dir).catch(() => [])
  return entries
    .filter(name => name.endsWith('.ts'))
    .filter(name => filter ? filter(name) : true)
    .sort()
}

async function handleTemplatesListCommand(cwd: string) {
  const projectRoot = await withProjectRoot(cwd)
  const candidates = [resolve(projectRoot, 'feathers/templates'), resolve(projectRoot, 'templates')]
  const found: string[] = []
  for (const dir of candidates) {
    const files = await listTsFiles(dir)
    if (files.length)
      found.push(`${dir}: ${files.join(', ')}`)
  }

  consola.box(`Templates\n${found.length ? found.join('\n') : '(none detected)'}`)
}

async function handlePluginsListCommand(cwd: string) {
  const projectRoot = await withProjectRoot(cwd)
  const plugins = await detectFeathersPlugins(projectRoot)
  consola.box(`Feathers plugins\n${plugins.length ? plugins.join('\n') : '(none detected)'}`)
}

async function handlePluginsAddCommand(cwd: string, args: CliContextArgs) {
  const nextArgs: CliContextArgs = { ...args, target: 'feathers' }
  await handleAddMiddlewareCommand(cwd, nextArgs)
}

async function handleModulesListCommand(cwd: string) {
  const projectRoot = await withProjectRoot(cwd)
  const modules = await detectServerModules(projectRoot)
  consola.box(`Server modules\n${modules.length ? modules.join('\n') : '(none detected)'}`)
}

async function handleModulesAddCommand(cwd: string, args: CliContextArgs) {
  await handleAddServerModuleCommand(cwd, args)
}

async function handleMiddlewaresListCommand(cwd: string, args: CliContextArgs) {
  const projectRoot = await withProjectRoot(cwd)
  const target = typeof args.target === 'string' ? String(args.target) : 'all'
  const sections: string[] = []

  const pushSection = async (label: string, dir: string, filter?: (name: string) => boolean) => {
    const files = await listTsFiles(dir, filter)
    if (files.length)
      sections.push(`${label}: ${files.join(', ')}`)
  }

  if (target === 'all' || target === 'nitro')
    await pushSection('nitro', resolve(projectRoot, 'server/middleware'))
  if (target === 'all' || target === 'route')
    await pushSection('route', resolve(projectRoot, 'app/middleware'))
  if (target === 'all' || target === 'feathers')
    await pushSection('feathers', resolve(projectRoot, 'server/feathers'))
  if (target === 'all' || target === 'hook')
    await pushSection('hook', resolve(projectRoot, 'server/feathers/hooks'))
  if (target === 'all' || target === 'policy')
    await pushSection('policy', resolve(projectRoot, 'server/feathers/policies'))
  if (target === 'all' || target === 'client-module')
    await pushSection('client-module', resolve(projectRoot, 'app/plugins'), name => name.endsWith('.client.ts'))
  if (target === 'all' || target === 'server-module' || target === 'module')
    await pushSection('server-module', resolve(projectRoot, 'server/feathers/modules'))

  consola.box(`Middlewares (${target})\n${sections.length ? sections.join('\n') : '(none detected)'}`)
}

async function handleMiddlewaresAddCommand(cwd: string, args: CliContextArgs) {
  await handleAddMiddlewareCommand(cwd, args)
}

async function handleMongoManagementCommand(cwd: string, args: CliContextArgs) {
  const projectRoot = await withProjectRoot(cwd)
  const dry = Boolean(args.dry)
  const enabled = parseBooleanFlag(args.enabled as string | boolean | undefined, true)
  const auth = parseBooleanFlag(args.auth as string | boolean | undefined, true)
  const exposeDatabasesService = parseBooleanFlag(args.exposeDatabasesService as string | boolean | undefined, true)
  const exposeCollectionsService = parseBooleanFlag(args.exposeCollectionsService as string | boolean | undefined, true)
  const exposeUsersService = parseBooleanFlag(args.exposeUsersService as string | boolean | undefined, false)
  const exposeCollectionCrud = parseBooleanFlag(args.exposeCollectionCrud as string | boolean | undefined, true)
  const basePath = normalizeMongoManagementBasePath(typeof args.basePath === 'string' ? String(args.basePath) : '/mongo')
  const url = typeof args.url === 'string' ? String(args.url).trim() : undefined

  await tryPatchNuxtConfig(projectRoot, {
    mongoManagement: {
      url,
      enabled,
      auth,
      basePath,
      exposeDatabasesService,
      exposeCollectionsService,
      exposeUsersService,
      exposeCollectionCrud,
    },
  }, { dry })

  const routes = getMongoManagementRoutes({
    enabled,
    basePath,
    exposeDatabasesService,
    exposeCollectionsService,
    exposeUsersService,
    exposeCollectionCrud,
  })

  const routeList = routes.length ? `- ${routes.map(route => route.path).join('\n- ')}` : '(none)'

  consola.box(`Mongo management ${enabled ? 'enabled' : 'disabled'}
basePath: ${basePath}
auth: ${auth}
routes:
${routeList}`)
}


export function createCliCommand() {
  const doctorCommand = defineCommand({
    meta: {
      name: 'doctor',
      description: 'Diagnose current project configuration',
    },
    run: async () => {
      await handleDoctorCommand(process.cwd())
    },
  })

  const initTemplatesCommand = defineCommand({
    meta: {
      name: 'templates',
      description: 'Initialize template overrides',
    },
    args: {
      dir: { type: 'string', description: 'Templates output directory' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleInitTemplatesCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const initEmbeddedCommand = defineCommand({
    meta: {
      name: 'embedded',
      description: 'Initialize embedded server mode',
    },
    args: {
      framework: { type: 'enum', options: ['express', 'koa'], description: 'Embedded framework' },
      servicesDir: { type: 'string', description: 'Services directory' },
      restPath: { type: 'string', description: 'REST path' },
      websocketPath: { type: 'string', description: 'WebSocket path' },
      websocketTransports: { type: 'string', description: 'Comma-separated websocket transports' },
      websocketConnectTimeout: { type: 'string', description: 'WebSocket connect timeout in ms' },
      websocketCorsOrigin: { type: 'string', description: 'WebSocket CORS origin' },
      websocketCorsCredentials: { type: 'boolean', description: 'WebSocket CORS credentials' },
      websocketCorsMethods: { type: 'string', description: 'Comma-separated WebSocket CORS methods' },
      secureDefaults: { type: 'boolean', description: 'Enable secure defaults' },
      cors: { type: 'boolean', description: 'Enable CORS module' },
      compression: { type: 'boolean', description: 'Enable compression module' },
      helmet: { type: 'boolean', description: 'Enable helmet module' },
      bodyParserJson: { type: 'boolean', description: 'Enable JSON body parser' },
      bodyParserUrlencoded: { type: 'boolean', description: 'Enable URL-encoded body parser' },
      serveStatic: { type: 'boolean', description: 'Enable static serving' },
      serveStaticPath: { type: 'string', description: 'Static path prefix' },
      serveStaticDir: { type: 'string', description: 'Static directory' },
      auth: { type: 'boolean', description: 'Enable embedded auth' },
      swagger: { type: 'boolean', description: 'Enable swagger legacy docs' },
      serverModulesPreset: { type: 'string', description: 'Server modules preset' },
      expressBaseline: { type: 'boolean', description: 'Compatibility alias for express-baseline preset' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleInitEmbeddedCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const initRemoteCommand = defineCommand({
    meta: {
      name: 'remote',
      description: 'Initialize remote client mode',
    },
    args: {
      url: { type: 'string', required: true, description: 'Remote Feathers URL' },
      transport: { type: 'enum', options: ['auto', 'rest', 'socketio'], description: 'Remote transport' },
      restPath: { type: 'string', description: 'REST path' },
      websocketPath: { type: 'string', description: 'WebSocket path' },
      websocketTransports: { type: 'string', description: 'Comma-separated websocket transports' },
      websocketConnectTimeout: { type: 'string', description: 'WebSocket connect timeout in ms' },
      websocketCorsOrigin: { type: 'string', description: 'WebSocket CORS origin' },
      websocketCorsCredentials: { type: 'boolean', description: 'WebSocket CORS credentials' },
      websocketCorsMethods: { type: 'string', description: 'Comma-separated WebSocket CORS methods' },
      auth: { type: 'boolean', description: 'Enable remote auth' },
      payloadMode: { type: 'enum', options: ['jwt', 'keycloak'], description: 'Remote auth payload mode' },
      strategy: { type: 'string', description: 'Auth strategy name' },
      tokenField: { type: 'string', description: 'Token field name' },
      servicePath: { type: 'string', description: 'Authentication service path' },
      reauth: { type: 'boolean', description: 'Enable reauthentication' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleInitRemoteCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const initCommand = defineCommand({
    meta: {
      name: 'init',
      description: 'Initialize templates or client/server modes',
    },
    subCommands: {
      templates: initTemplatesCommand,
      embedded: initEmbeddedCommand,
      remote: initRemoteCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const remoteAuthKeycloakCommand = defineCommand({
    meta: {
      name: 'keycloak',
      description: 'Configure remote auth payload mode for Keycloak',
    },
    args: {
      ssoUrl: { type: 'string', alias: 'url', required: true, description: 'Keycloak server URL' },
      realm: { type: 'string', required: true, description: 'Keycloak realm' },
      clientId: { type: 'string', required: true, description: 'Keycloak client id' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleRemoteAuthKeycloakCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const remoteAuthCommand = defineCommand({
    meta: {
      name: 'auth',
      description: 'Remote auth helpers',
    },
    subCommands: {
      keycloak: remoteAuthKeycloakCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const remoteCommand = defineCommand({
    meta: {
      name: 'remote',
      description: 'Remote mode helpers',
    },
    subCommands: {
      auth: remoteAuthCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const addServiceCommand = defineCommand({
    meta: {
      name: 'service',
      description: 'Generate an embedded service',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Service name' },
      custom: { type: 'boolean', description: 'Generate an adapter-less custom service' },
      type: { type: 'enum', options: ['adapter', 'custom'], description: 'Service kind' },
      adapter: { type: 'enum', options: ['memory', 'mongodb'], description: 'Service adapter' },
      schema: { type: 'enum', options: ['none', 'zod', 'json'], description: 'Schema generation mode' },
      auth: { type: 'boolean', description: 'Enable JWT auth hooks' },
      authAware: { type: 'boolean', description: 'Enable auth-aware password hashing/masking for users service' },
      idField: { type: 'enum', options: ['id', '_id'], description: 'Service id field' },
      path: { type: 'string', description: 'Service path' },
      collection: { type: 'string', description: 'MongoDB collection name' },
      methods: { type: 'string', description: 'Comma-separated standard methods' },
      customMethods: { type: 'string', description: 'Comma-separated custom methods' },
      docs: { type: 'boolean', description: 'Enable swagger legacy docs metadata' },
      servicesDir: { type: 'string', description: 'Services directory' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleAddServiceCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const addCustomServiceCommand = defineCommand({
    meta: {
      name: 'custom-service',
      description: 'Compatibility alias for add service --custom',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Service name' },
      schema: { type: 'enum', options: ['none', 'zod', 'json'], description: 'Schema generation mode' },
      auth: { type: 'boolean', description: 'Enable JWT auth hooks' },
      authAware: { type: 'boolean', description: 'Enable auth-aware password hashing/masking for users service' },
      path: { type: 'string', description: 'Service path' },
      methods: { type: 'string', description: 'Comma-separated standard methods' },
      customMethods: { type: 'string', description: 'Comma-separated custom methods' },
      docs: { type: 'boolean', description: 'Enable swagger legacy docs metadata' },
      servicesDir: { type: 'string', description: 'Services directory' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleAddServiceCommand(process.cwd(), args as CliContextArgs, true)
    },
  })

  const addRemoteServiceCommand = defineCommand({
    meta: {
      name: 'remote-service',
      description: 'Register a remote service (client-only)',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Service name' },
      path: { type: 'string', description: 'Remote service path' },
      methods: { type: 'string', description: 'Comma-separated service methods' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleAddRemoteServiceCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const addMiddlewareCommand = defineCommand({
    meta: {
      name: 'middleware',
      description: 'Generate middleware or middleware-like artifacts',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Middleware name' },
      target: { type: 'enum', options: ['nitro', 'route', 'feathers', 'server-module', 'module', 'client-module', 'hook', 'policy'], description: 'Generator target' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleAddMiddlewareCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const addServerModuleCommand = defineCommand({
    meta: {
      name: 'server-module',
      description: 'Generate an embedded server module (advanced)',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Module name' },
      preset: {
        type: 'enum',
        options: ['helmet', 'security-headers', 'request-logger', 'healthcheck', 'rate-limit', 'express-baseline'],
        description: 'Server module preset',
      },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleAddServerModuleCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const addMongoComposeCommand = defineCommand({
    meta: {
      name: 'mongodb-compose',
      description: 'Generate docker-compose-db.yaml for MongoDB',
    },
    args: {
      out: { type: 'string', description: 'Output file path' },
      service: { type: 'string', description: 'MongoDB service name' },
      port: { type: 'string', description: 'MongoDB port' },
      database: { type: 'string', description: 'MongoDB database name' },
      rootUser: { type: 'string', description: 'MongoDB root username' },
      rootPassword: { type: 'string', description: 'MongoDB root password' },
      volume: { type: 'string', description: 'MongoDB volume name' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleAddMongoComposeCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const mongoManagementCommand = defineCommand({
    meta: {
      name: 'management',
      description: 'Enable or update embedded MongoDB management routes',
    },
    args: {
      url: { type: 'string', description: 'MongoDB connection URL' },
      enabled: { type: 'boolean', description: 'Enable Mongo management surface' },
      auth: { type: 'boolean', description: 'Protect management routes with JWT auth' },
      basePath: { type: 'string', description: 'Mongo management base path' },
      exposeDatabasesService: { type: 'boolean', description: 'Expose /databases route' },
      exposeCollectionsService: { type: 'boolean', description: 'Expose /:db/collections route' },
      exposeUsersService: { type: 'boolean', description: 'Expose /users route' },
      exposeCollectionCrud: { type: 'boolean', description: 'Expose stats/indexes/count/schema/documents/aggregate routes' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args, rawArgs }) => {
      await handleMongoManagementCommand(process.cwd(), {
        ...(args as CliContextArgs),
        enabled: resolveBooleanCliArg(rawArgs, 'enabled', (args as CliContextArgs).enabled as string | boolean | undefined, true),
        auth: resolveBooleanCliArg(rawArgs, 'auth', (args as CliContextArgs).auth as string | boolean | undefined, true),
        exposeDatabasesService: resolveBooleanCliArg(rawArgs, 'exposeDatabasesService', (args as CliContextArgs).exposeDatabasesService as string | boolean | undefined, true),
        exposeCollectionsService: resolveBooleanCliArg(rawArgs, 'exposeCollectionsService', (args as CliContextArgs).exposeCollectionsService as string | boolean | undefined, true),
        exposeUsersService: resolveBooleanCliArg(rawArgs, 'exposeUsersService', (args as CliContextArgs).exposeUsersService as string | boolean | undefined, false),
        exposeCollectionCrud: resolveBooleanCliArg(rawArgs, 'exposeCollectionCrud', (args as CliContextArgs).exposeCollectionCrud as string | boolean | undefined, true),
      })
    },
  })

  const mongoCommand = defineCommand({
    meta: {
      name: 'mongo',
      description: 'MongoDB helpers',
    },
    subCommands: {
      management: mongoManagementCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const templatesListCommand = defineCommand({
    meta: {
      name: 'list',
      description: 'List template override files',
    },
    run: async () => {
      await handleTemplatesListCommand(process.cwd())
    },
  })

  const templatesCommand = defineCommand({
    meta: {
      name: 'templates',
      description: 'Template helpers',
    },
    subCommands: {
      list: templatesListCommand,
      init: initTemplatesCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const pluginsListCommand = defineCommand({
    meta: {
      name: 'list',
      description: 'List Feathers server plugins',
    },
    run: async () => {
      await handlePluginsListCommand(process.cwd())
    },
  })

  const pluginsAddCommand = defineCommand({
    meta: {
      name: 'add',
      description: 'Generate a Feathers server plugin',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Plugin name' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handlePluginsAddCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const pluginsCommand = defineCommand({
    meta: {
      name: 'plugins',
      description: 'Feathers plugin helpers',
    },
    subCommands: {
      list: pluginsListCommand,
      add: pluginsAddCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const modulesListCommand = defineCommand({
    meta: {
      name: 'list',
      description: 'List server modules',
    },
    run: async () => {
      await handleModulesListCommand(process.cwd())
    },
  })

  const modulesAddCommand = defineCommand({
    meta: {
      name: 'add',
      description: 'Generate a server module',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Module name' },
      preset: {
        type: 'enum',
        options: ['helmet', 'security-headers', 'request-logger', 'healthcheck', 'rate-limit', 'express-baseline'],
        description: 'Server module preset',
      },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleModulesAddCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const modulesCommand = defineCommand({
    meta: {
      name: 'modules',
      description: 'Server module helpers',
    },
    subCommands: {
      list: modulesListCommand,
      add: modulesAddCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const middlewaresListCommand = defineCommand({
    meta: {
      name: 'list',
      description: 'List middleware-like artifacts',
    },
    args: {
      target: { type: 'enum', options: ['all', 'nitro', 'route', 'feathers', 'hook', 'policy', 'client-module', 'server-module', 'module'], description: 'Filter target' },
    },
    run: async ({ args }) => {
      await handleMiddlewaresListCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const middlewaresAddCommand = defineCommand({
    meta: {
      name: 'add',
      description: 'Generate middleware or middleware-like artifacts',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Middleware name' },
      target: { type: 'enum', options: ['nitro', 'route', 'feathers', 'server-module', 'module', 'client-module', 'hook', 'policy'], description: 'Generator target' },
      force: { type: 'boolean', description: 'Overwrite existing files' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleMiddlewaresAddCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const middlewaresCommand = defineCommand({
    meta: {
      name: 'middlewares',
      description: 'Middleware helpers',
    },
    subCommands: {
      list: middlewaresListCommand,
      add: middlewaresAddCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const addCommand = defineCommand({
    meta: {
      name: 'add',
      description: 'Generate services, middleware, and compose files',
    },
    subCommands: {
      service: addServiceCommand,
      'custom-service': addCustomServiceCommand,
      'remote-service': addRemoteServiceCommand,
      middleware: addMiddlewareCommand,
      'server-module': addServerModuleCommand,
      'mongodb-compose': addMongoComposeCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  const authServiceCommand = defineCommand({
    meta: {
      name: 'service',
      description: 'Enable or disable JWT auth hooks on an existing service',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Service name' },
      servicesDir: { type: 'string', description: 'Services directory' },
      enabled: { type: 'boolean', description: 'Whether auth should be enabled' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
    },
    run: async ({ args }) => {
      await handleAuthServiceCommand(process.cwd(), args as CliContextArgs)
    },
  })


  const schemaCommand = defineCommand({
    meta: {
      name: 'schema',
      description: 'Inspect or change the schema mode of an existing service',
    },
    args: {
      name: { type: 'positional', required: true, description: 'Service name' },
      show: { type: 'boolean', description: 'Show human-readable schema summary' },
      get: { type: 'boolean', description: 'Compatibility alias for --show' },
      json: { type: 'boolean', description: 'Print machine-readable JSON schema summary' },
      export: { type: 'boolean', description: 'Export schema summary to services/.nfz/exports' },
      'set-mode': { type: 'enum', options: ['none', 'zod', 'json'], description: 'Switch schema mode' },
      'add-field': { type: 'string', description: 'Add field spec (ex: userId:string!, isActive:boolean=true)' },
      'remove-field': { type: 'string', description: 'Remove field by name' },
      'set-field': { type: 'string', description: 'Create or replace field spec' },
      'rename-field': { type: 'string', description: 'Rename field using from:to' },
      validate: { type: 'boolean', description: 'Validate auth compatibility and manifest invariants' },
      'repair-auth': { type: 'boolean', description: 'Repair auth-compatible users schema (restores zod + userId/password)' },
      servicesDir: { type: 'string', description: 'Services directory' },
      dry: { type: 'boolean', description: 'Dry run without writes' },
      diff: { type: 'boolean', description: 'Show manifest diff before applying changes' },
      force: { type: 'boolean', description: 'Allow overwriting generated artifacts' },
    },
    run: async ({ args }) => {
      await handleSchemaCommand(process.cwd(), args as CliContextArgs)
    },
  })

  const authCommand = defineCommand({
    meta: {
      name: 'auth',
      description: 'Auth-related helpers',
    },
    subCommands: {
      service: authServiceCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })

  return defineCommand({
    meta: {
      name: 'nuxt-feathers-zod',
      description: 'Feathers API integration for Nuxt',
    },
    subCommands: {
      doctor: doctorCommand,
      init: initCommand,
      remote: remoteCommand,
      add: addCommand,
      mongo: mongoCommand,
      templates: templatesCommand,
      plugins: pluginsCommand,
      modules: modulesCommand,
      middlewares: middlewaresCommand,
      schema: schemaCommand,
      auth: authCommand,
    },
    run: ({ rawArgs }) => {
      if (!rawArgs.length)
        printHelp()
    },
  })
}

export const mainCommand = createCliCommand()

export async function runCli(argv: string[], opts: RunCliOptions = { cwd: process.cwd() }) {
  const previousCwd = process.cwd()
  const cwd = opts.cwd || process.cwd()
  const throwOnError = opts.throwOnError ?? false

  try {
    process.chdir(resolve(cwd))
    await runMain(mainCommand, { rawArgs: argv })
  }
  catch (err) {
    if (throwOnError)
      throw err
    handleCliError(err)
  }
  finally {
    process.chdir(previousCwd)
  }
}
