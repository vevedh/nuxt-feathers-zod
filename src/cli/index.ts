import { resolve } from 'node:path'

import consola from 'consola'

import {
  type Adapter,
  type IdField,
  type MiddlewareTarget,
  type SchemaKind,
  type RunCliOptions,
  findProjectRoot,
  generateCustomService,
  generateMiddleware,
  generateService,
  handleCliError,
  initTemplates,
  parseFlags,
  printHelp,
  runDoctor,
  tryPatchNuxtConfig,
} from './core'

export type { RunCliOptions } from './core'
export { generateCustomService, generateService } from './core'


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

function parseWebsocketOptions(flags: Record<string, string | boolean>) {
  const connectTimeout = parseNumberFlag(flags.websocketConnectTimeout)
  const transports = parseCsvFlag(flags.websocketTransports)
  const corsOrigin = parseCorsOriginFlag(flags.websocketCorsOrigin)
  const corsCredentials = flags.websocketCorsCredentials === undefined
    ? undefined
    : parseBooleanFlag(flags.websocketCorsCredentials, false)
  const corsMethods = parseCsvFlag(flags.websocketCorsMethods)

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

export async function runCli(argv: string[], opts: RunCliOptions) {
  try {
    const cwd = resolve(opts.cwd)
    const [cmd, subcmd, nameOrTarget, ...rest] = argv

    if (!cmd || cmd === '-h' || cmd === '--help') {
      printHelp()
      return
    }

    if (cmd === 'doctor') {
      const projectRoot = await findProjectRoot(cwd)
      await runDoctor(projectRoot)
      return
    }

    if (cmd === 'remote' && subcmd === 'auth' && nameOrTarget === 'keycloak') {
      const flags = parseFlags(rest)
      const projectRoot = await findProjectRoot(cwd)
      const dry = Boolean(flags.dry)

      const ssoUrl = typeof flags.ssoUrl === 'string'
        ? String(flags.ssoUrl)
        : (typeof flags.url === 'string' ? String(flags.url) : '')
      const realm = typeof flags.realm === 'string' ? String(flags.realm) : ''
      const clientId = typeof flags.clientId === 'string' ? String(flags.clientId) : ''

      if (!ssoUrl || !realm || !clientId) {
        consola.error('Missing required flags: --ssoUrl <url> --realm <realm> --clientId <id>')
        printHelp()
        process.exitCode = 1
        return
      }

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
      return
    }

    if (cmd === 'init') {
      const initTarget = subcmd
      if (initTarget !== 'templates' && initTarget !== 'embedded' && initTarget !== 'remote') {
        consola.error(`Unknown init target: ${initTarget ?? '(missing)'}`)
        printHelp()
        process.exitCode = 1
        return
      }

      const flags = parseFlags([nameOrTarget, ...rest].filter(Boolean) as string[])
      const projectRoot = await findProjectRoot(cwd)
      const dry = Boolean(flags.dry)

      if (initTarget === 'templates') {
        const dir = typeof flags.dir === 'string' ? String(flags.dir) : 'feathers/templates'
        const force = Boolean(flags.force)
        await initTemplates({ projectRoot, outDir: resolve(projectRoot, dir), force, dry })
        await tryPatchNuxtConfig(projectRoot, { templatesDir: dir }, { dry })
        return
      }

      if (initTarget === 'embedded') {
        const servicesDir = typeof flags.servicesDir === 'string' ? String(flags.servicesDir) : 'services'
        const framework = (typeof flags.framework === 'string' ? String(flags.framework) : 'express') as 'express' | 'koa'
        const restPath = typeof flags.restPath === 'string' ? String(flags.restPath) : '/feathers'
        const websocketPath = typeof flags.websocketPath === 'string' ? String(flags.websocketPath) : '/socket.io'
        const websocket = parseWebsocketOptions(flags)
        const secureDefaults = parseBooleanFlag(flags.secureDefaults, true)
        const enableAuth = parseBooleanFlag(flags.auth, false)
        const enableSwagger = parseBooleanFlag(flags.swagger, false)
        const serveStaticEnabled = parseBooleanFlag(flags.serveStatic, false)
        const serverModulesPreset = typeof flags.serverModulesPreset === 'string'
          ? String(flags.serverModulesPreset)
          : (flags.expressBaseline ? 'express-baseline' : undefined)

        if (serverModulesPreset === 'express-baseline') {
          await generateMiddleware({
            projectRoot,
            name: 'express-baseline',
            target: 'server-module',
            dry,
            force: Boolean(flags.force),
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
              cors: parseBooleanFlag(flags.cors, true),
              compression: parseBooleanFlag(flags.compression, true),
              helmet: parseBooleanFlag(flags.helmet, true),
              bodyParser: {
                json: parseBooleanFlag(flags.bodyParserJson, true),
                urlencoded: parseBooleanFlag(flags.bodyParserUrlencoded, true),
              },
              serveStatic: serveStaticEnabled
                ? {
                    path: typeof flags.serveStaticPath === 'string' ? String(flags.serveStaticPath) : '/',
                    dir: typeof flags.serveStaticDir === 'string' ? String(flags.serveStaticDir) : 'public',
                  }
                : false,
            },
          },
        }, { dry })
        return
      }

      const flagsUrl = typeof flags.url === 'string' ? String(flags.url) : ''
      const transport = (
        typeof flags.transport === 'string' ? String(flags.transport) : 'socketio'
      ) as 'auto' | 'rest' | 'socketio'
      const restPath = typeof flags.restPath === 'string' ? String(flags.restPath) : '/feathers'
      const websocketPath = typeof flags.websocketPath === 'string' ? String(flags.websocketPath) : '/socket.io'
      const websocket = parseWebsocketOptions(flags)

      if (!flagsUrl) {
        consola.error('Missing required flag: --url <http(s)://...>')
        printHelp()
        process.exitCode = 1
        return
      }

      const authEnabled = parseBooleanFlag(flags.auth, false)
      const payloadMode = (typeof flags.payloadMode === 'string' ? String(flags.payloadMode) : 'jwt') as 'jwt' | 'keycloak'
      const strategy = typeof flags.strategy === 'string' ? String(flags.strategy) : 'jwt'
      const tokenField = typeof flags.tokenField === 'string' ? String(flags.tokenField) : 'accessToken'
      const servicePath = typeof flags.servicePath === 'string' ? String(flags.servicePath) : 'authentication'
      const reauth = parseBooleanFlag(flags.reauth, true)

      await tryPatchNuxtConfig(projectRoot, {
        clientMode: 'remote',
        remote: {
          url: flagsUrl,
          transport,
          restPath,
          websocketPath,
          websocket,
          auth: authEnabled
            ? { enabled: true, payloadMode, strategy, tokenField, servicePath, reauth }
            : { enabled: false },
        },
      }, { dry })
      return
    }

    if (cmd !== 'add') {
      consola.error(`Unknown command: ${cmd}`)
      printHelp()
      process.exitCode = 1
      return
    }

    if (
      subcmd !== 'service' &&
      subcmd !== 'custom-service' &&
      subcmd !== 'remote-service' &&
      subcmd !== 'middleware' &&
      subcmd !== 'server-module'
    ) {
      consola.error(`Unknown add target: ${subcmd ?? '(missing)'}`)
      printHelp()
      process.exitCode = 1
      return
    }

    if (!nameOrTarget) {
      consola.error('Missing <name>.')
      printHelp()
      process.exitCode = 1
      return
    }

    const flags = parseFlags(rest)

    if (subcmd === 'service' || subcmd === 'custom-service') {
      const adapter = (flags.adapter as Adapter | undefined) ?? 'memory'
      const auth = Boolean(flags.auth)
      const custom = subcmd === 'custom-service'
        || parseBooleanFlag(flags.custom, false)
        || flags.type === 'custom'
        || typeof flags.customMethods === 'string'
      const idField = (flags.idField as IdField | undefined) ?? (adapter === 'mongodb' ? '_id' : 'id')
      const servicePath = typeof flags.path === 'string' ? String(flags.path) : undefined
      const collectionName = typeof flags.collection === 'string' ? String(flags.collection) : undefined
      const methods = typeof flags.methods === 'string' ? String(flags.methods) : undefined
      const customMethods = typeof flags.customMethods === 'string' ? String(flags.customMethods) : undefined
      const docs = Boolean(flags.docs)
      const schema = (flags.schema as SchemaKind | undefined) ?? 'none'
      const dry = Boolean(flags.dry)
      const force = Boolean(flags.force)
      const projectRoot = await findProjectRoot(cwd)
      const servicesDirName = typeof flags.servicesDir === 'string' ? String(flags.servicesDir) : 'services'
      const servicesDir = resolve(projectRoot, servicesDirName)

      if (subcmd === 'custom-service' && !dry) {
        consola.warn('[nfz] `add custom-service` is kept as a compatibility alias. Prefer `add service <name> --custom`.')
      }

      await generateService({
        projectRoot,
        servicesDir,
        name: nameOrTarget,
        adapter,
        auth,
        idField,
        servicePath,
        collectionName,
        docs,
        schema,
        dry,
        force,
        custom,
        methods,
        customMethods,
      })
      await tryPatchNuxtConfig(projectRoot, { servicesDir: servicesDirName }, { dry })
      return
    }

    if (subcmd === 'server-module') {
      const dry = Boolean(flags.dry)
      const force = Boolean(flags.force)
      const preset = typeof flags.preset === 'string'
        ? String(flags.preset)
        : (flags.preset === true ? nameOrTarget : undefined)
      const projectRoot = await findProjectRoot(cwd)

      await generateMiddleware({
        projectRoot,
        name: nameOrTarget,
        target: 'server-module',
        dry,
        force,
        preset,
      })

      await tryPatchNuxtConfig(projectRoot, { ensureServerModuleDir: 'server/feathers/modules' }, { dry })
      return
    }

    if (subcmd === 'remote-service') {
      const dry = Boolean(flags.dry)
      const projectRoot = await findProjectRoot(cwd)
      const methods = typeof flags.methods === 'string'
        ? String(flags.methods).split(',').map(s => s.trim()).filter(Boolean)
        : undefined
      const path = typeof flags.path === 'string' ? String(flags.path) : nameOrTarget

      await tryPatchNuxtConfig(projectRoot, {
        clientMode: 'remote',
        remoteService: { path, methods },
      }, { dry })
      return
    }

    const target = (flags.target as MiddlewareTarget | undefined) ?? 'nitro'
    const dry = Boolean(flags.dry)
    const force = Boolean(flags.force)
    const projectRoot = await findProjectRoot(cwd)

    await generateMiddleware({
      projectRoot,
      name: nameOrTarget,
      target,
      dry,
      force,
    })

    if (target === 'feathers') {
      await tryPatchNuxtConfig(projectRoot, { ensureServerFeathersPluginsDir: true }, { dry })
    }

    if (target === 'server-module' || target === 'module') {
      await tryPatchNuxtConfig(projectRoot, { ensureServerModuleDir: 'server/feathers/modules' }, { dry })
    }
  } catch (err) {
    handleCliError(err)
  }
}
