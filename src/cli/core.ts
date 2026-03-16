import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { camelCase, kebabCase, pascalCase } from 'change-case'
import consola from 'consola'


export function handleCliError(err: unknown) {
  const e = err as any
  const message = e?.message ? String(e.message) : String(err)

  // Common DX issue: trying to regenerate an existing artifact
  if (message.startsWith('File already exists:')) {
    consola.error(message)
    consola.info('Tip: re-run the command with --force to overwrite, or choose a different name.')
    process.exitCode = 1
    return
  }

  // Default: show a clean message (avoid full stack spam on Windows)
  if (e?.stack && typeof e.stack === 'string') {
    consola.error(message)
  } else {
    consola.error(message)
  }
  process.exitCode = 1
}


export type Adapter = 'mongodb' | 'memory'
export type SchemaKind = 'none' | 'zod' | 'json'
export type MiddlewareTarget = 'nitro' | 'feathers' | 'server-module' | 'module' | 'client-module' | 'hook' | 'policy'
export type IdField = 'id' | '_id'
export type CollectionName = string

export interface RunCliOptions {
  cwd?: string
  throwOnError?: boolean
}


export interface ServiceSchemaField {
  type: string
  required?: boolean
  default?: string | number | boolean | null
  secret?: boolean
}

export interface ServiceManifest {
  name: string
  path: string
  adapter: Adapter
  auth: boolean
  custom?: boolean
  authAware?: boolean
  idField?: IdField
  collectionName?: string
  methods?: string[]
  customMethods?: string[]
  schema: {
    mode: SchemaKind
    fields: Record<string, ServiceSchemaField>
  }
}

export { runDoctor } from './commands/doctor'

function findNuxtConfigPath(projectRoot: string): string | null {
  const candidates = [
    'nuxt.config.ts',
    'nuxt.config.mts',
    'nuxt.config.js',
    'nuxt.config.mjs',
  ].map(f => resolve(projectRoot, f))
  return candidates.find(f => existsSync(f)) ?? null
}

export function printHelp() {
  // Keep this as a single template literal (Bun parser-safe).
  // IMPORTANT: Do not insert raw text outside strings.
  console.log(`
nuxt-feathers-zod CLI

Usage:
  bunx nuxt-feathers-zod <command> [args] [--flags]

Commands:
  init templates                Initialize template overrides (default: feathers/templates)
  init embedded                 Initialize embedded server mode (Feathers inside Nuxt/Nitro)
  init remote                   Initialize remote client mode (Feathers client -> external server)
  remote auth keycloak          Configure remote auth payload mode for Keycloak
  add service <name>            Generate an embedded service (or a service with custom methods via --custom)
  add remote-service <name>     Register a remote service (client-only)
  add middleware <name>         Generate middleware (target nitro|feathers)
  add mongodb-compose           Generate docker-compose-db.yaml for MongoDB
  mongo management             Enable/update embedded MongoDB management routes
  schema <service>              Inspect schema state or switch schema mode
  auth service <name>           Enable/disable JWT auth hooks on an existing service
  doctor                        Diagnose current project configuration

Global flags (most commands):
  --dry                         Dry run (no writes)
  --force                       Overwrite existing files (generators)

Notes:
  - The CLI auto-patches nuxt.config.* to ensure:
    - modules: [..., 'nuxt-feathers-zod']
    - feathers: { ... } minimal defaults required by the chosen command
  - Embedded: generate services via CLI (recommended), then test REST:
      GET http://localhost:3000/feathers/<service>
  - MongoDB adapter requires an embedded mongodbClient (see docs). Default adapter is memory.

Examples:
  bunx nuxt-feathers-zod init templates
  bunx nuxt-feathers-zod init embedded --force
  bunx nuxt-feathers-zod init embedded --force --auth
  bunx nuxt-feathers-zod add service users
  bunx nuxt-feathers-zod add service users --adapter mongodb --collection users
  bunx nuxt-feathers-zod add service actions --custom --methods find,get --customMethods run,preview
  bunx nuxt-feathers-zod init remote --url http://localhost:3030
  bunx nuxt-feathers-zod init remote --url http://localhost:3030 --transport rest
  bunx nuxt-feathers-zod add remote-service users --path users --methods find,get,create,patch,remove
  bunx nuxt-feathers-zod add mongodb-compose
  bunx nuxt-feathers-zod mongo management --url mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin --auth false
  bunx nuxt-feathers-zod auth service users --enabled true
  bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example --realm myrealm --clientId myapp
  bunx nuxt-feathers-zod doctor

Flags overview:

  init templates:
    --dir <dir>                (default: feathers/templates)
    --force
    --dry
    --diff                      show manifest diff before applying changes

  init embedded:
    --framework express|koa      (default: express)
    --servicesDir <dir>          (default: services)
    --restPath <path>            (default: /feathers)
    --websocketPath <path>       (default: /socket.io)
    --websocketTransports <list> (ex: websocket,polling)
    --websocketConnectTimeout <ms> (default: 45000)
    --websocketCorsOrigin <value> (ex: true|*|https://app.example.com)
    --websocketCorsCredentials true|false
    --websocketCorsMethods <list> (ex: GET,POST)
    --secureDefaults true|false  (default: true)
    --cors true|false            (default: true)
    --compression true|false     (default: true)
    --helmet true|false          (default: true)
    --bodyParserJson true|false  (default: true)
    --bodyParserUrlencoded true|false (default: true)
    --serveStatic true|false     (default: false)
    --serveStaticPath <path>     (default: /)
    --serveStaticDir <dir>       (default: public)
    --serverModulesPreset <name> (ex: express-baseline)
    --expressBaseline            scaffold Express baseline server modules
    --auth true|false            (default: false)
    --swagger true|false         (default: false)
    --force
    --dry

  init remote:
    --url <http(s)://...>       (required)
    --transport socketio|rest|auto (default: socketio, auto resolves to socketio in remote mode)
    --restPath <path>           (default: /feathers)
    --websocketPath <path>      (default: /socket.io)
    --websocketTransports <list> (ex: websocket,polling)
    --websocketConnectTimeout <ms> (default: 45000)
    --websocketCorsOrigin <value>
    --websocketCorsCredentials true|false
    --websocketCorsMethods <list>
    --auth true|false           (default: false)
    --payloadMode jwt|keycloak  (default: jwt)
    --strategy jwt              (default: jwt)
    --tokenField accessToken    (default: accessToken)
    --servicePath authentication (default: authentication)
    --reauth true|false         (default: true)
    --force
    --dry

  remote auth keycloak:
    --ssoUrl <url>              (required)
    --realm <realm>             (required)
    --clientId <id>             (required)
    --dry

  add service <name>:
    --custom                    generate an adapter-less service with custom methods
    --type adapter|custom       explicit service kind (optional)
    --adapter memory|mongodb    (default: memory; ignored for --custom)
    --schema none|zod|json      (default: none)
    --auth true|false           (default: false)
    --idField id|_id            (default: id; mongodb default: _id; ignored for --custom)
    --path <servicePath>        (default: /<name>)
    --collection <name>         (mongodb only; ignored for --custom)
    --methods find,get,create,patch,remove (custom only; optional)
    --customMethods run,preview (custom only; optional)
    --docs true|false           (default: false; swagger legacy)
    --servicesDir <dir>         (default: services)
    --force
    --dry

  add remote-service <name>:
    --path <servicePath>        (default: <name>)
    --methods find,get,create,patch,remove,custom (optional)
    --dry

  add mongodb-compose:
    --out <file>                (default: docker-compose-db.yaml)
    --service <name>            (default: mongodb)
    --port <port>               (default: 27017)
    --database <name>           (default: app)
    --rootUser <user>           (default: root)
    --rootPassword <pass>       (default: change-me)
    --volume <name>             (default: mongodb_data)
    --force
    --dry

  auth service <name>:
    --servicesDir <dir>         (default: services)
    --enabled true|false        (default: true)
    --dry

  mongo management:
    --url <mongodb-url>         set/update MongoDB connection URL
    --enabled true|false        (default: true)
    --auth true|false           (default: true)
    --basePath <path>           (default: /mongo)
    --exposeDatabasesService true|false   (default: true)
    --exposeCollectionsService true|false (default: true)
    --exposeUsersService true|false       (default: false)
    --exposeCollectionCrud true|false     (default: true)
    --dry

  add middleware <name>:
    --target nitro|feathers|server-module|module (default: nitro)
    --force
    --dry

  schema <service>:
    --show                      human-readable schema summary
    --json                      machine-readable schema summary
    --export                    write schema summary to services/.nfz/exports
    --get                       compatibility alias of --show
    --set-mode none|zod|json    switch schema mode
    --add-field <spec>          add field (ex: userId:string!, isActive:boolean=true)
    --remove-field <name>       remove field from manifest/schema
    --set-field <spec>          create or replace field definition
    --rename-field <from:to>    rename field preserving definition
    --servicesDir <dir>         (default: services)
    --force
    --dry

  add server-module <name>:
    --preset helmet|security-headers|request-logger|healthcheck|rate-limit|express-baseline
    --force
    --dry
`)
}


export function parseFlags(argv: string[]) {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a)
      continue
    if (!a.startsWith('--'))
      continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
      continue
    }
    out[key] = next
    i++
  }
  return out
}


// --- nuxt.config.ts feathers:{} auto-init helpers (DX) -----------------------

export type NuxtConfigPatch = {
  servicesDir?: string
  templatesDir?: string
  ensureServerFeathersPluginsDir?: boolean
  ensureServerModuleDir?: string

  // client mode helpers
  clientMode?: 'embedded' | 'remote'
  remote?: {
    url: string
    transport?: 'auto' | 'rest' | 'socketio'
    restPath?: string
    websocketPath?: string
    websocket?: {
      connectTimeout?: number
      transports?: string[]
      cors?: {
        origin?: boolean | string | string[]
        credentials?: boolean
        methods?: string[]
      }
    }
    auth?: {
      enabled?: boolean
      payloadMode?: 'jwt' | 'keycloak'
      strategy?: string
      tokenField?: string
      servicePath?: string
      reauth?: boolean
    }
  }
  keycloak?: {
    serverUrl?: string
    realm?: string
    clientId?: string
    onLoad?: string
  }
  
  // embedded init helpers
  embedded?: {
    framework?: 'express' | 'koa'
    restPath?: string
    websocketPath?: string
    websocket?: {
      connectTimeout?: number
      transports?: string[]
      cors?: {
        origin?: boolean | string | string[]
        credentials?: boolean
        methods?: string[]
      }
    }
    secureDefaults?: boolean
    auth?: boolean
    swagger?: boolean
    secure?: {
      cors?: boolean
      compression?: boolean
      helmet?: boolean
      bodyParser?: {
        json?: boolean
        urlencoded?: boolean
      }
      serveStatic?: false | {
        path?: string
        dir?: string
      }
    }
  }

// quick helper to register a remote service path (remote mode)
  remoteService?: { path: string, methods?: string[] }
  mongoManagement?: {
    url?: string
    enabled?: boolean
    auth?: boolean
    basePath?: string
    exposeDatabasesService?: boolean
    exposeCollectionsService?: boolean
    exposeUsersService?: boolean
    exposeCollectionCrud?: boolean
  }
}

export async function tryPatchNuxtConfig(projectRoot: string, patch: NuxtConfigPatch, opts: { dry: boolean }) {
  const candidates = [
    'nuxt.config.ts',
    'nuxt.config.mts',
    'nuxt.config.js',
    'nuxt.config.mjs',
  ].map(f => resolve(projectRoot, f))

  const file = candidates.find(f => existsSync(f))
  if (!file) {
    consola.warn('[nuxt-feathers-zod] nuxt.config file not found (skip feathers:{} auto-init)')
    return
  }

  const original = await readFile(file, 'utf8')
  const updated = applyNuxtConfigPatch(original, patch)

  if (updated === original) {
    consola.info(`[nuxt-feathers-zod] nuxt.config already contains required feathers:{} settings (${relativeToCwd(file)})`)
    return
  }

  if (opts.dry) {
    consola.info(`[dry] patch ${relativeToCwd(file)} (feathers:{})`)
    return
  }

  await writeFile(file, updated, 'utf8')
  consola.success(`[nuxt-feathers-zod] patched ${relativeToCwd(file)} (feathers:{})`)
}

function applyNuxtConfigPatch(src: string, patch: NuxtConfigPatch): string {
  // We keep this intentionally simple and robust for common Nuxt config shapes:
  // export default defineNuxtConfig({ ... })
  const m = src.match(/defineNuxtConfig\(\s*\{/)
  if (!m || m.index == null) {
    // unknown format; no-op
    return src
  }

  // Ensure module is registered (modules: [..., 'nuxt-feathers-zod'])
  let out = ensureNuxtModuleInConfig(src, 'nuxt-feathers-zod')

  // Ensure feathers block exists
  if (!/\bfeathers\s*:\s*\{/.test(out)) {
    const insertAt = (m.index + m[0].length)
    const feathersBlock = buildFeathersBlock(patch)
    out = out.slice(0, insertAt) + feathersBlock + out.slice(insertAt)
    return out
  }

  // Patch inside existing feathers block
  const block = locateObjectLiteral(out, /\bfeathers\s*:\s*\{/)
  if (!block) return out

  const before = out.slice(0, block.start)
  const feathersObj = out.slice(block.start, block.end)
  const after = out.slice(block.end)

  const patchedObj = patchFeathersObjectLiteral(feathersObj, patch)
  return before + patchedObj + after
}

function ensureNuxtModuleInConfig(src: string, moduleName: string): string {
  // If modules array exists, ensure moduleName is present; otherwise insert a modules array.
  if (new RegExp(`[\\"\']${moduleName}[\\"\']`).test(src)) {
    return src
  }

  const m = src.match(/defineNuxtConfig\(\s*\{/)
  if (!m || m.index == null) return src

  // Try to patch existing modules: [...]
  const arr = locateArrayLiteral(src, /\bmodules\s*:\s*\[/)
  if (arr) {
    const before = src.slice(0, arr.start)
    const arrText = src.slice(arr.start, arr.end)
    const after = src.slice(arr.end)

    // Insert before closing ']' while preserving basic formatting.
    const insertAt = arrText.lastIndexOf(']')
    if (insertAt < 0) return src
    const inner = arrText.slice(1, insertAt)
    const hasItems = /\S/.test(inner.trim())

    // If the array is multi-line, insert with a newline and matching indentation.
    const indentMatch = arrText.match(/\n(\s*)\]$/)
    const itemIndent = indentMatch ? indentMatch[1] : ''

    let insertion = ''
    if (!hasItems) {
      insertion = `'${moduleName}'`
    } else if (indentMatch) {
      insertion = `,\n${itemIndent}'${moduleName}'`
    } else {
      insertion = `, '${moduleName}'`
    }

    const patched = arrText.slice(0, insertAt) + insertion + arrText.slice(insertAt)
    return before + patched + after
  }

  // No modules array: insert right after opening '{' of defineNuxtConfig
  const insertAt = m.index + m[0].length
  const block = `\n  modules: ['${moduleName}'],\n`
  return src.slice(0, insertAt) + block + src.slice(insertAt)
}


function renderWebsocketConfig(websocket: any, websocketPath?: string): string {
  const parts: string[] = []
  parts.push(`path: '${websocketPath ?? '/socket.io'}'`)
  if ((websocket as any)?.connectTimeout != null) parts.push(`connectTimeout: ${(websocket as any).connectTimeout}`)
  if ((websocket as any)?.transports?.length) parts.push(`transports: ${JSON.stringify((websocket as any).transports)}`)
  const corsObj = (websocket as any)?.cors
  if (corsObj) {
    const cors: string[] = []
    if (corsObj.origin !== undefined) cors.push(`origin: ${JSON.stringify(corsObj.origin)}`)
    if (corsObj.credentials !== undefined) cors.push(`credentials: ${corsObj.credentials}`)
    if (corsObj.methods?.length) cors.push(`methods: ${JSON.stringify(corsObj.methods)}`)
    if (cors.length) parts.push(`cors: { ${cors.join(', ')} }`)
  }
  return `{ ${parts.join(', ')} }`
}

function buildFeathersBlock(patch: NuxtConfigPatch): string {
  const servicesDir = patch.servicesDir ?? 'services'
  const templatesDir = patch.templatesDir
  const isRemote = (patch.clientMode === 'remote' || !!patch.remote || !!patch.remoteService)
  const servicesPart = isRemote ? '' : `
      servicesDirs: ['${servicesDir}'],`
  const authPart = isRemote ? `
      auth: false,` : ''

  const templatesPart = templatesDir
    ? `
    templates: {
      dirs: ['${templatesDir}'],
      strict: true,
      allow: ['server/*.ts', 'client/*.ts', 'types/*.d.ts']
    },`
    : ''

  const serverParts: string[] = []
  if (patch.ensureServerFeathersPluginsDir)
    serverParts.push(`pluginDirs: ['server/feathers']`)
  if (patch.ensureServerModuleDir)
    serverParts.push(`moduleDirs: ['${patch.ensureServerModuleDir}']`)

  if (patch.embedded) {
    const secureDefaults = patch.embedded.secureDefaults !== false
    serverParts.push(`enabled: true`)
    serverParts.push(`secureDefaults: ${secureDefaults}`)
    if (patch.embedded.secure)
      serverParts.push(`secure: ${renderSecureConfig(patch.embedded.secure)}`)
  }

  const serverPart = serverParts.length
    ? `
    server: {
      ${serverParts.join(',\n      ')}
    },`
    : ''

  const embeddedPart = (() => {
    if (!patch.embedded) return ''
    const framework = patch.embedded.framework ?? 'express'
    const restPath = patch.embedded.restPath ?? '/feathers'
    const websocketPath = patch.embedded.websocketPath ?? '/socket.io'
    const websocketConfig = renderWebsocketConfig(patch.embedded.websocket as any, websocketPath)
    const authEnabled = patch.embedded.auth !== false
    const swaggerEnabled = Boolean(patch.embedded.swagger)

    return `
    transports: {
      rest: { path: '${restPath}', framework: '${framework}' },
      websocket: ${websocketConfig}
    },
    auth: ${authEnabled},
    swagger: ${swaggerEnabled},`
  })()


  const mongoManagementPart = (() => {
    if (!patch.mongoManagement) return ''
    const parts: string[] = []
    if (patch.mongoManagement.url) parts.push(`url: '${patch.mongoManagement.url}'`)
    const managementParts = [
      patch.mongoManagement.enabled !== undefined ? `enabled: ${patch.mongoManagement.enabled}` : '',
      patch.mongoManagement.auth !== undefined ? `auth: ${patch.mongoManagement.auth}` : '',
      patch.mongoManagement.basePath ? `basePath: '${patch.mongoManagement.basePath}'` : '',
      patch.mongoManagement.exposeDatabasesService !== undefined ? `exposeDatabasesService: ${patch.mongoManagement.exposeDatabasesService}` : '',
      patch.mongoManagement.exposeCollectionsService !== undefined ? `exposeCollectionsService: ${patch.mongoManagement.exposeCollectionsService}` : '',
      patch.mongoManagement.exposeUsersService !== undefined ? `exposeUsersService: ${patch.mongoManagement.exposeUsersService}` : '',
      patch.mongoManagement.exposeCollectionCrud !== undefined ? `exposeCollectionCrud: ${patch.mongoManagement.exposeCollectionCrud}` : '',
    ].filter(Boolean)
    parts.push(`management: { ${managementParts.join(', ')} }`)
    return `
    database: { mongo: { ${parts.join(', ')} } },`
  })()

  const keycloakParts = [
    patch.keycloak?.serverUrl ? `serverUrl: '${patch.keycloak.serverUrl}'` : '',
    patch.keycloak?.realm ? `realm: '${patch.keycloak.realm}'` : '',
    patch.keycloak?.clientId ? `clientId: '${patch.keycloak.clientId}'` : '',
    patch.keycloak?.onLoad ? `onLoad: '${patch.keycloak.onLoad}'` : '',
  ].filter(Boolean)

  const keycloakPart = patch.keycloak
    ? `
    keycloak: { ${keycloakParts.join(', ')} },`
    : ''

  const clientPart = (() => {
    if (!patch.clientMode && !patch.remote && !patch.remoteService)
      return ''

    if (patch.clientMode === 'remote' || patch.remote || patch.remoteService) {
      const url = patch.remote?.url ? `'${patch.remote.url}'` : `''`
      const transport = patch.remote?.transport ? `'${patch.remote.transport}'` : `'auto'`
      const restPath = patch.remote?.restPath ? `'${patch.remote.restPath}'` : 'undefined'
      const websocketPath = patch.remote?.websocketPath ? `'${patch.remote.websocketPath}'` : 'undefined'
      const websocket = patch.remote?.websocket
        ? renderWebsocketConfig(patch.remote.websocket as any, patch.remote.websocketPath)
        : ''
      const remoteAuth = patch.remote?.auth
        ? `auth: { ${[
            patch.remote.auth.enabled !== undefined ? `enabled: ${patch.remote.auth.enabled}` : '',
            patch.remote.auth.payloadMode ? `payloadMode: '${patch.remote.auth.payloadMode}'` : '',
            patch.remote.auth.strategy ? `strategy: '${patch.remote.auth.strategy}'` : '',
            patch.remote.auth.tokenField ? `tokenField: '${patch.remote.auth.tokenField}'` : '',
            patch.remote.auth.servicePath ? `servicePath: '${patch.remote.auth.servicePath}'` : '',
            patch.remote.auth.reauth !== undefined ? `reauth: ${patch.remote.auth.reauth}` : '',
          ].filter(Boolean).join(', ')} }`
        : ''

      const serviceMethods = patch.remoteService?.methods?.length
        ? `, methods: ${JSON.stringify(patch.remoteService.methods)}`
        : ''
      const servicesEntry = patch.remoteService
        ? `{ path: '${patch.remoteService.path}'${serviceMethods} }`
        : ''

      const services = servicesEntry ? `services: [${servicesEntry}]` : ''

      const remoteParts = [
        `url: ${url}`,
        `transport: ${transport}`,
        restPath !== 'undefined' ? `restPath: ${restPath}` : '',
        websocketPath !== 'undefined' ? `websocketPath: ${websocketPath}` : '',
        websocket ? `websocket: ${websocket}` : '',
        remoteAuth,
        services,
      ].filter(Boolean)
      const remoteObj = `remote: { ${remoteParts.join(', ')} }`

      return `
    client: {
      mode: 'remote',
      ${remoteObj}
    },`
    }

    return `
    client: { mode: 'embedded' },`
  })()

  return `
    feathers: {${servicesPart}${authPart}${templatesPart}${serverPart}${embeddedPart}${mongoManagementPart}${keycloakPart}${clientPart}
    },`
}


function patchFeathersObjectLiteral(feathersObj: string, patch: NuxtConfigPatch): string {
  let out = feathersObj

  // servicesDirs
  if (patch.servicesDir) {
    if (/\bservicesDirs\s*:/.test(out)) {
      out = replaceArrayContains(out, 'servicesDirs', patch.servicesDir)
    } else {
      out = insertProp(out, `servicesDirs: ['${patch.servicesDir}']`)
    }
  }

  // templates
  if (patch.templatesDir) {
    if (/\btemplates\s*:/.test(out)) {
      // ensure dirs includes templatesDir
      out = ensureNestedTemplatesDirs(out, patch.templatesDir)
    } else {
      out = insertProp(
        out,
        `templates: { dirs: ['${patch.templatesDir}'], strict: true, `
        + `allow: ['server/*.ts', 'client/*.ts', 'types/*.d.ts'] }`,
      )
    }
  }

  // keycloak
  if (patch.keycloak) {
    const parts: string[] = []
    if (patch.keycloak.serverUrl) parts.push(`serverUrl: '${patch.keycloak.serverUrl}'`)
    if (patch.keycloak.realm) parts.push(`realm: '${patch.keycloak.realm}'`)
    if (patch.keycloak.clientId) parts.push(`clientId: '${patch.keycloak.clientId}'`)
    if (patch.keycloak.onLoad) parts.push(`onLoad: '${patch.keycloak.onLoad}'`)
    if (/\bkeycloak\s*:/.test(out)) {
      const block = locateObjectLiteral(out, /\bkeycloak\s*:\s*\{/)
      if (block) {
        out = out.slice(0, block.start) + `keycloak: { ${parts.join(', ')} }` + out.slice(block.end)
      }
    } else {
      out = insertProp(out, `keycloak: { ${parts.join(', ')} }`)
    }
  }

  // server plugins dir
  if (patch.ensureServerFeathersPluginsDir) {
    if (!/\bloadFeathersConfig\s*:/.test(out)) {
      out = insertProp(out, `loadFeathersConfig: true`)
    }
    // ensure server.pluginDirs
    if (/\bserver\s*:/.test(out)) {
      out = ensureNestedServerPluginDirs(out, 'server/feathers')
    } else {
      out = insertProp(out, `server: { pluginDirs: ['server/feathers'] }`)
    }
  }

  if (patch.ensureServerModuleDir) {
    if (/\bserver\s*:/.test(out)) {
      out = ensureNestedServerModuleDirs(out, patch.ensureServerModuleDir)
    } else {
      out = insertProp(out, `server: { moduleDirs: ['${patch.ensureServerModuleDir}'] }`)
    }
  }


// client mode / remote
if (patch.clientMode || patch.remote || patch.remoteService) {
  // Ensure client block exists
  if (/\bclient\s*:/.test(out)) {
    out = ensureNestedClientRemote(out, patch)
  } else {
    // insert minimal client block
    if (patch.clientMode === 'embedded') {
      out = insertProp(out, `client: { mode: 'embedded' }`)
    } else {
      // remote by default when remote settings are requested
      const url = patch.remote?.url ? `'${patch.remote.url}'` : `''`
      const transport = patch.remote?.transport ? `'${patch.remote.transport}'` : `'auto'`
      const parts: string[] = []
      parts.push(`url: ${url}`)
      parts.push(`transport: ${transport}`)
      if (patch.remote?.restPath) parts.push(`restPath: '${patch.remote.restPath}'`)
      if (patch.remote?.websocketPath) parts.push(`websocketPath: '${patch.remote.websocketPath}'`)
      if (patch.remote?.websocket) {
        parts.push(
          `websocket: ${renderWebsocketConfig(patch.remote.websocket as any, patch.remote.websocketPath)}`,
        )
      }
      if (patch.remote?.auth) {
        const a = patch.remote.auth
        const ap: string[] = []
        if (a.enabled !== undefined) ap.push(`enabled: ${a.enabled}`)
        if (a.payloadMode) ap.push(`payloadMode: '${a.payloadMode}'`)
        if (a.strategy) ap.push(`strategy: '${a.strategy}'`)
        if (a.tokenField) ap.push(`tokenField: '${a.tokenField}'`)
        if (a.servicePath) ap.push(`servicePath: '${a.servicePath}'`)
        if (a.reauth !== undefined) ap.push(`reauth: ${a.reauth}`)
        parts.push(`auth: { ${ap.join(', ')} }`)
      }
      if (patch.remoteService) {
        const methodsPart = patch.remoteService.methods?.length
          ? `, methods: ${JSON.stringify(patch.remoteService.methods)}`
          : ''
        const entry = `{ path: '${patch.remoteService.path}'${methodsPart} }`
        parts.push(`services: [${entry}]`)
      }
      out = insertProp(out, `client: { mode: 'remote', remote: { ${parts.join(', ')} } }`)
    }
  }
}

  if (patch.remote) {
    const remoteRestPath = patch.remote.restPath ?? '/feathers'
    const remoteWebsocket = renderWebsocketConfig(patch.remote.websocket as any, patch.remote.websocketPath ?? '/socket.io')
    if (!/\btransports\s*:/.test(out)) {
      out = insertProp(out, `transports: { rest: { path: '${remoteRestPath}' }, websocket: ${remoteWebsocket} }`)
    } else {
      out = ensureNestedTransports(out, undefined, remoteRestPath, remoteWebsocket)
    }
  }
  // In remote mode, embedded auth should be disabled to avoid requiring local services imports.
  if (patch.clientMode === 'remote' || patch.remote) {
    if (!/\bauth\s*:/.test(out)) {
      out = insertProp(out, `auth: false`)
    }
  }




  if (patch.mongoManagement) {
    const parts: string[] = []
    if (patch.mongoManagement.url) parts.push(`url: '${patch.mongoManagement.url}'`)

    const managementParts: string[] = []
    if (patch.mongoManagement.enabled !== undefined) managementParts.push(`enabled: ${patch.mongoManagement.enabled}`)
    if (patch.mongoManagement.auth !== undefined) managementParts.push(`auth: ${patch.mongoManagement.auth}`)
    if (patch.mongoManagement.basePath) managementParts.push(`basePath: '${patch.mongoManagement.basePath}'`)
    if (patch.mongoManagement.exposeDatabasesService !== undefined) managementParts.push(`exposeDatabasesService: ${patch.mongoManagement.exposeDatabasesService}`)
    if (patch.mongoManagement.exposeCollectionsService !== undefined) managementParts.push(`exposeCollectionsService: ${patch.mongoManagement.exposeCollectionsService}`)
    if (patch.mongoManagement.exposeUsersService !== undefined) managementParts.push(`exposeUsersService: ${patch.mongoManagement.exposeUsersService}`)
    if (patch.mongoManagement.exposeCollectionCrud !== undefined) managementParts.push(`exposeCollectionCrud: ${patch.mongoManagement.exposeCollectionCrud}`)
    parts.push(`management: { ${managementParts.join(', ')} }`)

    const mongoValue = `mongo: { ${parts.join(', ')} }`
    if (/database\s*:/.test(out)) {
      out = ensureNestedDatabaseMongo(out, mongoValue)
    } else {
      out = insertProp(out, `database: { ${mongoValue} }`)
    }
  }


  // embedded extras (server secure defaults + transports + auth/swagger)
  if (patch.embedded) {
    // transports
    const framework = patch.embedded.framework ?? 'express'
    const restPath = patch.embedded.restPath ?? '/feathers'
    const websocketPath = patch.embedded.websocketPath ?? '/socket.io'
    const websocketConfig = renderWebsocketConfig(patch.embedded.websocket as any, websocketPath)
    if (!/\btransports\s*:/.test(out)) {
      out = insertProp(
        out,
        `transports: { rest: { path: '${restPath}', framework: '${framework}' }, websocket: ${websocketConfig} }`,
      )
    } else {
      out = ensureNestedTransports(out, framework, restPath, websocketConfig)
    }
    // server.enabled + secureDefaults + secure preset options
    const secureDefaults = patch.embedded.secureDefaults !== false
    if (/\bserver\s*:/.test(out)) {
      // ensure enabled + secureDefaults inside server block
      out = ensureNestedServerProp(out, `enabled: true`)
      out = ensureNestedServerProp(out, `secureDefaults: ${secureDefaults}`)
      if (patch.embedded.secure) {
        out = ensureNestedServerSecure(out, patch.embedded.secure)
      }
    } else {
      const secureProp = patch.embedded.secure ? `, secure: ${renderSecureConfig(patch.embedded.secure)}` : ''
      out = insertProp(out, `server: { enabled: true, secureDefaults: ${secureDefaults}${secureProp} }`)
    }

    // auth + swagger explicit (embedded)
    const authEnabled = patch.embedded.auth !== false
    if (/\bauth\s*:/.test(out)) {
      out = replacePropValue(out, 'auth', authEnabled ? 'true' : 'false')
    } else {
      out = insertProp(out, `auth: ${authEnabled}`)
    }

    const swaggerEnabled = Boolean(patch.embedded.swagger)
    if (/\bswagger\s*:/.test(out)) {
      out = replacePropValue(out, 'swagger', swaggerEnabled ? 'true' : 'false')
    } else {
      out = insertProp(out, `swagger: ${swaggerEnabled}`)
    }
  }

  return out
}


function ensureNestedDatabaseMongo(objLiteral: string, mongoValue: string): string {
  const block = locateObjectLiteral(objLiteral, /database\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  let databaseObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)

  if (/mongo\s*:/.test(databaseObj)) {
    const mongoBlock = locateObjectLiteral(databaseObj, /mongo\s*:\s*\{/)
    if (mongoBlock) {
      databaseObj = databaseObj.slice(0, mongoBlock.start) + mongoValue + databaseObj.slice(mongoBlock.end)
    }
  } else {
    databaseObj = insertProp(databaseObj, mongoValue)
  }

  return before + databaseObj + after
}


function ensureNestedTransports(
  objLiteral: string,
  framework: 'express' | 'koa' | undefined,
  restPath: string,
  websocketConfig: string,
): string {
  const block = locateObjectLiteral(objLiteral, /\btransports\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  let transportsObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)

  const restConfig = framework ? `rest: { path: '${restPath}', framework: '${framework}' }` : `rest: { path: '${restPath}' }`
  if (/\brest\s*:/.test(transportsObj)) {
    const restBlock = locateObjectLiteral(transportsObj, /\brest\s*:\s*\{/)
    if (restBlock)
      transportsObj = transportsObj.slice(0, restBlock.start) + restConfig + transportsObj.slice(restBlock.end)
  } else {
    transportsObj = insertProp(transportsObj, restConfig)
  }

  if (/\bwebsocket\s*:/.test(transportsObj)) {
    const websocketBlock = locateObjectLiteral(transportsObj, /\bwebsocket\s*:\s*\{/)
    if (websocketBlock)
      transportsObj =
        transportsObj.slice(0, websocketBlock.start)
        + `websocket: ${websocketConfig}`
        + transportsObj.slice(websocketBlock.end)
  } else {
    transportsObj = insertProp(transportsObj, `websocket: ${websocketConfig}`)
  }

  return before + transportsObj + after
}

function locateObjectLiteral(src: string, startPattern: RegExp): { start: number; end: number } | null {
  const m = startPattern.exec(src)
  if (!m || m.index == null) return null
  const braceStart = src.indexOf('{', m.index)
  if (braceStart < 0) return null
  let depth = 0
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return { start: braceStart, end: i + 1 }
      }
    }
  }
  return null
}


function locateArrayLiteral(src: string, startPattern: RegExp): { start: number; end: number } | null {
  const m = startPattern.exec(src)
  if (!m || m.index == null) return null
  const bracketStart = src.indexOf('[', m.index)
  if (bracketStart < 0) return null
  let depth = 0
  for (let i = bracketStart; i < src.length; i++) {
    const ch = src[i]
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) {
        return { start: bracketStart, end: i + 1 }
      }
    }
  }
  return null
}

function insertProp(objLiteral: string, prop: string): string {
  // insert after opening '{'
  const idx = objLiteral.indexOf('{')
  if (idx < 0) return objLiteral
  const insertAt = idx + 1
  // Keep indentation roughly: assume 2 spaces inside feathers block
  return objLiteral.slice(0, insertAt) + `\n    ${prop},` + objLiteral.slice(insertAt)
}

/**
 * Replace a top-level property value inside an object literal string.
 *
 * NOTE: This helper is intentionally conservative and is currently only
 * used for simple scalar replacements (e.g. booleans like `auth`/`swagger`).
 */
function replacePropValue(objLiteral: string, prop: string, newValue: string): string {
  const re = new RegExp(`\\b${prop}\\s*:\\s*([^,}]+)`, 'm')
  if (!re.test(objLiteral)) return objLiteral
  return objLiteral.replace(re, (_m, _old) => `${prop}: ${newValue}`)
}

function replaceArrayContains(objLiteral: string, propName: string, value: string): string {
  // naive: if servicesDirs: ['a','b'] then ensure value included
  const re = new RegExp(`(${propName}\\s*:\\s*\\[)([^\\]]*)(\\])`)
  const m = objLiteral.match(re)
  if (!m) return objLiteral
  const inner = m[2]
  if (new RegExp(`['\"]${escapeRegExp(value)}['\"]`).test(inner)) return objLiteral
  const newInner = inner.trim().length ? `${inner.trim().replace(/\s+$/,'')}, '${value}'` : `'${value}'`
  return objLiteral.replace(re, `$1${newInner}$3`)
}

function ensureNestedTemplatesDirs(objLiteral: string, value: string): string {
  // best-effort: locate templates: { ... } and add/ensure dirs
  const block = locateObjectLiteral(objLiteral, /\btemplates\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  const tplObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)
  let patched = tplObj
  if (/\bdirs\s*:/.test(patched)) patched = replaceArrayContains(patched, 'dirs', value)
  else patched = insertProp(patched, `dirs: ['${value}']`)
  if (!/\bstrict\s*:/.test(patched)) patched = insertProp(patched, `strict: true`)
  if (!/\ballow\s*:/.test(patched)) patched = insertProp(patched, `allow: ['server/*.ts', 'client/*.ts', 'types/*.d.ts']`)
  return before + patched + after
}

function ensureNestedServerPluginDirs(objLiteral: string, value: string): string {
  const block = locateObjectLiteral(objLiteral, /\bserver\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  const srvObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)
  let patched = srvObj
  if (/\bpluginDirs\s*:/.test(patched)) patched = replaceArrayContains(patched, 'pluginDirs', value)
  else patched = insertProp(patched, `pluginDirs: ['${value}']`)
  return before + patched + after
}

function ensureNestedServerModuleDirs(objLiteral: string, value: string): string {
  const block = locateObjectLiteral(objLiteral, /\bserver\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  const srvObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)
  let patched = srvObj
  if (/\bmoduleDirs\s*:/.test(patched)) patched = replaceArrayContains(patched, 'moduleDirs', value)
  else patched = insertProp(patched, `moduleDirs: ['${value}']`)
  return before + patched + after
}

/**
 * Ensure a scalar property is present inside the nested `server: { ... }` block.
 *
 * Best-effort string patcher used by `init embedded`.
 */
function ensureNestedServerProp(objLiteral: string, propAssignment: string): string {
  const block = locateObjectLiteral(objLiteral, /\bserver\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  const srvObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)

  const idx = propAssignment.indexOf(':')
  const key = (idx >= 0 ? propAssignment.slice(0, idx) : propAssignment).trim()
  const value = idx >= 0 ? propAssignment.slice(idx + 1).trim() : ''

  let patched = srvObj
  if (new RegExp(`\\b${escapeRegExp(key)}\\s*:`).test(patched)) {
    patched = replacePropValue(patched, key, value)
  } else {
    patched = insertProp(patched, propAssignment)
  }
  return before + patched + after
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ---------------------------------------------------------------------------

export interface InitTemplatesOptions {
  projectRoot: string
  outDir: string
  force: boolean
  dry: boolean
}

const TEMPLATE_KEYS = [
  'server/server.ts',
  'server/plugin.ts',
  'server/mongodb.ts',
  'server/authentication.ts',
  'server/keycloak.ts',
  'client/client.ts',
  'client/connection.ts',
  'client/plugin.ts',
  'client/authentication.ts',
] as const

export async function initTemplates(opts: InitTemplatesOptions) {
  const { projectRoot, outDir, force, dry } = opts

  // Try to snapshot current generated templates from Nuxt build output when available.
  const generatedDirCandidates = [
    resolve(projectRoot, '.nuxt/feathers'),
    resolve(projectRoot, 'node_modules/.cache/nuxt/.nuxt/feathers'),
  ]
  const generatedDir = generatedDirCandidates.find(d => existsSync(d))

  if (!dry) {
    await mkdir(outDir, { recursive: true })
  }

  consola.info(`[nuxt-feathers-zod] init templates
  note: embedded server modules load order = scan (server.moduleDirs) then list (server.modules) -> ${outDir}`)
  if (generatedDir)
    consola.info(`[nuxt-feathers-zod] snapshot source detected -> ${generatedDir}`)

  for (const key of TEMPLATE_KEYS) {
    const dst = resolve(outDir, key)
    const dstDir = resolve(dst, '..')

    if (existsSync(dst) && !force) {
      consola.info(`- skip (exists): ${key}`)
      continue
    }

    if (!dry) {
      await mkdir(dstDir, { recursive: true })
    }

    // If we can snapshot from .nuxt/feathers, copy the real generated file for this key.
    const snapshotSrc = generatedDir ? resolve(generatedDir, key) : null
    if (snapshotSrc && existsSync(snapshotSrc)) {
      if (!dry)
        await copyFile(snapshotSrc, dst)
      consola.success(`- ${force ? 'overwrite' : 'write'} (snapshot): ${key}`)
      continue
    }

    // Fallback: write a safe placeholder that compiles and guides the user.
    const placeholder = renderTemplatePlaceholder(key)
    if (!dry)
      await writeFile(dst, placeholder, 'utf8')
    consola.success(`- ${force ? 'overwrite' : 'write'} (placeholder): ${key}`)
  }

  // Write a small README for context
  const readmePath = resolve(outDir, 'README.md')
  if (!existsSync(readmePath) || force) {
    const readme = `# nuxt-feathers-zod — Template overrides

This folder contains *override templates* for the Nuxt module \`nuxt-feathers-zod\`.

## How it works

- The module generates runtime files under \`.nuxt/feathers/**\` during dev/build.
- When you enable template overrides, the module will prefer files from this folder when a matching key exists.

A key is the path relative to the \`feathers\` root, e.g.:
- \`server/plugin.ts\`
- \`client/connection.ts\`

## Enable in nuxt.config.ts

\`\`\`ts
export default defineNuxtConfig({
  feathers: {
    templates: {
      dirs: ['feathers/templates'],
      strict: true,
      allow: ['server/*.ts', 'client/*.ts'],
    },
  },
})
\`\`\`

## Tips

- If this folder was initialized from a snapshot, each file is a copy of the currently generated \`.nuxt/feathers/<key>\`.
- If a file is a placeholder, start by copying the generated version from \`.nuxt/feathers/<key>\` then edit.
`
    if (!dry)
      await writeFile(readmePath, readme, 'utf8')
  }
}

function renderTemplatePlaceholder(key: string) {
  // Keep placeholders as valid TS modules.
  // They are not used unless overrides are enabled in nuxt.config.ts.
  return `// Template override: ${key}
  //
  // This file is used as an override source for:
  //   .nuxt/feathers/${key}
  //
  // How to get started:
  // 1) Run your app once (bun dev) so Nuxt generates .nuxt/feathers/**.
  // 2) Copy the generated file from .nuxt/feathers/${key} into this file.
  // 3) Edit as needed (keep it compatible with Nitro / Nuxt build).
  //
  // NOTE: The module defaults still apply when no override exists.

export {}
`
}


export async function findProjectRoot(start: string) {
  // Walk up until we find a package.json.
  let dir = resolve(start)
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(dir, 'package.json')))
      return dir
    const parent = resolve(dir, '..')
    if (parent === dir)
      break
    dir = parent
  }
  throw new Error(`Could not find project root from ${start}`)
}

function singularize(input: string) {
  // Minimal heuristic (good enough for a DX helper; users can rename if needed)
  if (input.endsWith('ies'))
    return `${input.slice(0, -3)}y`
  if (input.endsWith('ses'))
    return input.slice(0, -2)
  if (input.endsWith('s') && input.length > 1)
    return input.slice(0, -1)
  return input
}

function normalizeServiceName(raw: string) {
  // Allow "posts", "haproxy-domains", "traefik_stacks" etc.
  return kebabCase(raw)
}



function getNfzRoot(servicesDir: string) {
  return join(servicesDir, '.nfz')
}

function getServiceManifestPath(servicesDir: string, serviceNameKebab: string) {
  return join(getNfzRoot(servicesDir), 'services', `${serviceNameKebab}.json`)
}

function getGlobalManifestPath(servicesDir: string) {
  return join(getNfzRoot(servicesDir), 'manifest.json')
}

function parseSharedServicePath(source: string, ids: ReturnType<typeof createServiceIds>) {
  const byCamel = source.match(new RegExp(`export const ${ids.baseCamel}Path = ['\"]([^'\"]+)['\"]`))?.[1]
  if (byCamel)
    return byCamel
  const generic = source.match(/export const [A-Za-z0-9_]+Path = ['\"]([^'\"]+)['\"]/)?.[1]
  return generic || ids.serviceNameKebab
}

function parseMethodsFromShared(source: string, ids: ReturnType<typeof createServiceIds>) {
  const byCamel = source.match(new RegExp(`export const ${ids.baseCamel}Methods[^=]*= \[(.*?)\]`, 's'))?.[1]
  const generic = source.match(/export const [A-Za-z0-9_]+Methods[^=]*= \[(.*?)\]/s)?.[1]
  const raw = byCamel || generic || ''
  return raw.split(',').map(v => v.trim().replace(/^['\"]|['\"]$/g, '')).filter(Boolean)
}

function inferFieldTypeFromZodExpression(expr: string): string {
  const value = expr.replace(/\s+/g, ' ').trim()
  if (/objectIdSchema\(\)/.test(value))
    return 'id'
  if (/z\.string\(\)/.test(value))
    return 'string'
  if (/z\.number\(\)/.test(value))
    return 'number'
  if (/z\.boolean\(\)/.test(value))
    return 'boolean'
  if (/z\.date\(\)/.test(value))
    return 'date'
  if (/z\.array\(\s*z\.string\(\)\s*\)/.test(value))
    return 'string[]'
  if (/z\.array\(\s*z\.number\(\)\s*\)/.test(value))
    return 'number[]'
  if (/z\.array\(\s*z\.boolean\(\)\s*\)/.test(value))
    return 'boolean[]'
  if (/z\.array\(/.test(value))
    return 'array'
  if (/z\.record\(/.test(value) || /z\.object\(/.test(value))
    return 'object'
  return 'string'
}

function parseDefaultLiteral(raw: string): string | number | boolean | null {
  const value = raw.trim()
  if (value === 'true')
    return true
  if (value === 'false')
    return false
  if (value === 'null')
    return null
  if (/^['\"].*['\"]$/.test(value))
    return value.slice(1, -1)
  const num = Number(value)
  if (Number.isFinite(num))
    return num
  return value
}

function parseDefaultFromZodExpression(expr: string): string | number | boolean | null | undefined {
  const match = expr.match(/\.default\(([^)]+)\)/)
  if (!match)
    return undefined
  return parseDefaultLiteral(match[1])
}

function parseZodFields(source: string): Record<string, ServiceSchemaField> {
  const block = source.match(/export const [A-Za-z0-9_]+Schema = z\.object\((\{[\s\S]*?\})\)/)
  if (!block)
    return {}
  const body = block[1].slice(1, -1)
  const fields: Record<string, ServiceSchemaField> = {}
  for (const line of body.split('\n')) {
    const trimmed = line.trim().replace(/,$/, '')
    if (!trimmed || trimmed.startsWith('//'))
      continue
    const idx = trimmed.indexOf(':')
    if (idx === -1)
      continue
    const name = trimmed.slice(0, idx).trim()
    const expr = trimmed.slice(idx + 1).trim()
    if (!/^[A-Za-z0-9_]+$/.test(name))
      continue
    const def = parseDefaultFromZodExpression(expr)
    fields[name] = {
      type: inferFieldTypeFromZodExpression(expr),
      required: !(/\.optional\(\)|\.nullish\(\)/.test(expr)),
      ...(def !== undefined ? { default: def } : {}),
      ...(name.toLowerCase().includes('password') ? { secret: true } : {}),
    }
  }
  return fields
}

function parseJsonFields(source: string): Record<string, ServiceSchemaField> {
  const fields: Record<string, ServiceSchemaField> = {}
  const requiredMatch = source.match(/required:\s*\[([^\]]*)\]/)
  const required = new Set((requiredMatch?.[1] || '').split(',').map(v => v.trim().replace(/^['\"]|['\"]$/g, '')).filter(Boolean))
  for (const line of source.split('\n')) {
    const trimmed = line.trim().replace(/,$/, '')
    const match = trimmed.match(/^([A-Za-z0-9_]+):\s*\{\s*type:\s*['\"]([^'\"]+)['\"](?:,\s*default:\s*([^,}]+))?.*\}$/)
    if (!match)
      continue
    const [, name, type, rawDefault] = match
    fields[name] = {
      type,
      required: required.has(name),
      ...(rawDefault !== undefined ? { default: parseDefaultLiteral(rawDefault) } : {}),
      ...(name.toLowerCase().includes('password') ? { secret: true } : {}),
    }
  }
  return fields
}


const SUPPORTED_FIELD_TYPES = new Set(['string', 'number', 'boolean', 'date', 'object', 'array', 'id', 'string[]', 'number[]', 'boolean[]'])

function assertSupportedFieldType(type: string) {
  if (!SUPPORTED_FIELD_TYPES.has(type))
    throw new Error(`Unsupported field type '${type}'. Supported types: ${Array.from(SUPPORTED_FIELD_TYPES).join(', ')}`)
}

function parseFieldSpec(spec: string): { name: string, field: ServiceSchemaField } {
  const raw = String(spec || '').trim()
  if (!raw)
    throw new Error('Missing field spec. Expected format <name>:<type>[!][=<default>]')

  const idx = raw.indexOf(':')
  if (idx <= 0)
    throw new Error(`Invalid field spec '${raw}'. Expected format <name>:<type>[!][=<default>]`)

  const name = raw.slice(0, idx).trim()
  let rest = raw.slice(idx + 1).trim()
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    throw new Error(`Invalid field name '${name}'. Use letters, numbers and underscore only.`)

  let defaultValue: string | number | boolean | null | undefined
  const eqIdx = rest.indexOf('=')
  if (eqIdx !== -1) {
    defaultValue = parseDefaultLiteral(rest.slice(eqIdx + 1))
    rest = rest.slice(0, eqIdx).trim()
  }

  let required = false
  if (rest.endsWith('!')) {
    required = true
    rest = rest.slice(0, -1).trim()
  }

  const type = rest
  assertSupportedFieldType(type)

  const field: ServiceSchemaField = {
    type,
    required,
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    ...(name.toLowerCase().includes('password') ? { secret: true } : {}),
  }

  return { name, field }
}

function parseRenameFieldSpec(spec: string): { from: string, to: string } {
  const raw = String(spec || '').trim()
  const idx = raw.indexOf(':')
  if (idx <= 0)
    throw new Error(`Invalid rename spec '${raw}'. Expected format <from>:<to>`)
  const from = raw.slice(0, idx).trim()
  const to = raw.slice(idx + 1).trim()
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(from) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(to))
    throw new Error(`Invalid rename spec '${raw}'. Field names must use letters, numbers and underscore only.`)
  return { from, to }
}

async function inferServiceManifest(projectRoot: string, servicesDir: string, name: string): Promise<ServiceManifest> {
  const serviceNameKebab = normalizeServiceName(name)
  const ids = createServiceIds(serviceNameKebab)
  const manifestPath = getServiceManifestPath(servicesDir, serviceNameKebab)
  if (existsSync(manifestPath))
    return JSON.parse(await readFile(manifestPath, 'utf8')) as ServiceManifest

  const dir = join(servicesDir, serviceNameKebab)
  const sharedPath = join(dir, `${serviceNameKebab}.shared.ts`)
  const classPath = join(dir, `${serviceNameKebab}.class.ts`)
  const servicePathFile = join(dir, `${serviceNameKebab}.ts`)
  const schemaPath = join(dir, `${serviceNameKebab}.schema.ts`)

  if (!existsSync(sharedPath) || !existsSync(classPath) || !existsSync(servicePathFile))
    throw new Error(`Service '${serviceNameKebab}' not found in ${relativeToCwd(servicesDir)}`)

  const sharedSource = await readFile(sharedPath, 'utf8')
  const classSource = await readFile(classPath, 'utf8')
  const serviceSource = await readFile(servicePathFile, 'utf8')
  const schemaSource = existsSync(schemaPath) ? await readFile(schemaPath, 'utf8') : ''

  const adapter: Adapter = classSource.includes('@feathersjs/mongodb') || classSource.includes('MongoDBService') ? 'mongodb' : 'memory'
  const custom = !(classSource.includes('MemoryService') || classSource.includes('MongoDBService'))
  const schemaMode: SchemaKind = !schemaSource ? 'none' : (schemaSource.includes("from 'zod'") || schemaSource.includes('zodQuerySyntax')) ? 'zod' : 'json'
  const methods = parseMethodsFromShared(sharedSource, ids)
  const fields = schemaMode === 'zod' ? parseZodFields(schemaSource) : schemaMode === 'json' ? parseJsonFields(schemaSource) : {}
  const path = parseSharedServicePath(sharedSource, ids)
  const collectionName = adapter === 'mongodb'
    ? (classSource.match(/collection\('([^']+)'\)/)?.[1] || classSource.match(/Service \\\'([^']+)\\\'/)?.[1] || serviceNameKebab)
    : undefined
  const idField: IdField = schemaSource.includes('_id') || classSource.includes('_id') ? '_id' : 'id'

  return {
    name: serviceNameKebab,
    path,
    adapter,
    auth: serviceSource.includes("authenticate('jwt')"),
    custom,
    idField,
    ...(collectionName ? { collectionName } : {}),
    ...(methods.length ? { methods } : {}),
    ...(custom ? { customMethods: methods.filter(m => !STD_SERVICE_METHODS.has(m)) } : {}),
    schema: {
      mode: schemaMode,
      fields,
    },
  }
}

async function writeServiceManifest(servicesDir: string, manifest: ServiceManifest, io: { dry: boolean, force: boolean }) {
  const nfzRoot = getNfzRoot(servicesDir)
  const serviceManifestPath = getServiceManifestPath(servicesDir, manifest.name)
  const globalManifestPath = getGlobalManifestPath(servicesDir)
  await ensureDir(join(nfzRoot, 'services'), io.dry)
  await writeFileSafe(serviceManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { dry: io.dry, force: true })

  const global = existsSync(globalManifestPath)
    ? JSON.parse(await readFile(globalManifestPath, 'utf8'))
    : { services: {} as Record<string, any> }
  global.services[manifest.name] = {
    path: manifest.path,
    adapter: manifest.adapter,
    auth: manifest.auth,
    custom: !!manifest.custom,
    schemaMode: manifest.schema.mode,
  }
  await ensureDir(nfzRoot, io.dry)
  await writeFileSafe(globalManifestPath, `${JSON.stringify(global, null, 2)}\n`, { dry: io.dry, force: true })
}

function formatFieldFlags(field: ServiceSchemaField) {
  const flags: string[] = [field.required ? 'required' : 'optional']
  if (field.secret)
    flags.push('secret')
  if (field.default !== undefined)
    flags.push(`default=${JSON.stringify(field.default)}`)
  return flags.join(' ')
}

function renderManifestShow(manifest: ServiceManifest) {
  const lines = [
    `Service: ${manifest.name}`,
    `Path: ${manifest.path}`,
    `Adapter: ${manifest.adapter}`,
    `Auth: ${manifest.auth ? 'yes' : 'no'}`,
    `Custom: ${manifest.custom ? 'yes' : 'no'}`,
    `Auth-aware: ${resolveAuthAwareFlag(manifest.name, manifest.auth, manifest.authAware) ? 'yes' : 'no'}`,
    `Schema mode: ${manifest.schema.mode}`,
    ...renderAuthCompatibilityLine(manifest),
    '',
    'Fields:',
  ]
  const entries = Object.entries(manifest.schema.fields)
  if (!entries.length)
    lines.push('- (none)')
  else
    for (const [name, field] of entries)
      lines.push(`- ${name.padEnd(12)} ${String(field.type).padEnd(10)} ${formatFieldFlags(field)}`.trimEnd())
  return lines.join('\n')
}

function summarizeManifestDiff(before: ServiceManifest, after: ServiceManifest) {
  const lines: string[] = []
  if (before.authAware !== after.authAware)
    lines.push(`~ authAware: ${String(before.authAware)} -> ${String(after.authAware)}`)
  if (before.schema.mode !== after.schema.mode)
    lines.push(`~ schema.mode: ${before.schema.mode} -> ${after.schema.mode}`)

  const beforeFields = before.schema.fields || {}
  const afterFields = after.schema.fields || {}
  const names = Array.from(new Set([...Object.keys(beforeFields), ...Object.keys(afterFields)])).sort()
  for (const name of names) {
    const prev = beforeFields[name]
    const next = afterFields[name]
    if (!prev && next) {
      lines.push(`+ field ${name}: ${next.type}${next.required ? ' required' : ''}${next.default !== undefined ? ` default=${JSON.stringify(next.default)}` : ''}`)
      continue
    }
    if (prev && !next) {
      lines.push(`- field ${name}`)
      continue
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      lines.push(`~ field ${name}: ${JSON.stringify(prev)} -> ${JSON.stringify(next)}`)
    }
  }

  return lines.length ? lines.join('\n') : '(no changes)'
}

function protectedAuthFields(manifest: ServiceManifest) {
  if (manifest.auth && manifest.name === 'users')
    return new Set(['userId', 'password'])
  return new Set<string>()
}

function getAuthCompatibility(manifest: ServiceManifest) {
  const issues: string[] = []
  if (!(manifest.auth && manifest.name === 'users'))
    return { applicable: false as const, ok: true, issues }

  const authAware = resolveAuthAwareFlag(manifest.name, manifest.auth, manifest.authAware)
  if (!authAware)
    issues.push('auth-aware generation is disabled; local-auth password hashing and password masking are not guaranteed')

  if (manifest.schema.mode !== 'none') {
    const userId = manifest.schema.fields.userId
    if (!userId)
      issues.push("missing required field 'userId'")
    else {
      if (userId.type !== 'string')
        issues.push("field 'userId' must be type string")
      if (userId.required === false)
        issues.push("field 'userId' must be required")
    }

    const password = manifest.schema.fields.password
    if (!password)
      issues.push("missing required field 'password'")
    else {
      if (password.type !== 'string')
        issues.push("field 'password' must be type string")
      if (password.required === false)
        issues.push("field 'password' must be required")
    }
  }

  return {
    applicable: true as const,
    ok: issues.length === 0,
    issues,
  }
}

function renderAuthCompatibilityLine(manifest: ServiceManifest) {
  const auth = getAuthCompatibility(manifest)
  if (!auth.applicable)
    return ['Auth compatibility: n/a']

  const lines = [`Auth compatibility: ${auth.ok ? 'yes' : 'no'}`]
  if (!auth.ok) {
    lines.push('Auth issues:')
    for (const issue of auth.issues)
      lines.push(`- ${issue}`)
  }
  return lines
}


function enforceAuthSchemaGuard(_manifest: ServiceManifest, _nextMode: SchemaKind, _force: boolean) {
}

function enforceAuthFieldGuards(manifest: ServiceManifest, opts: { removeField?: string, renameField?: string, setField?: string, force: boolean }) {
  const protectedFields = protectedAuthFields(manifest)
  if (!protectedFields.size)
    return

  const deny = (field: string, action: string) => {
    const msg = `Field '${field}' is protected for auth-enabled users service; cannot ${action} without --force.`
    if (!opts.force)
      throw new Error(msg)
    consola.warn(`[nfz] ${msg} Proceeding because --force was provided.`)
  }

  if (opts.removeField) {
    const field = String(opts.removeField).trim()
    if (protectedFields.has(field))
      deny(field, 'remove it')
  }

  if (opts.renameField) {
    const { from, to } = parseRenameFieldSpec(opts.renameField)
    if (protectedFields.has(from) || protectedFields.has(to))
      deny(protectedFields.has(from) ? from : to, 'rename it')
  }

  if (opts.setField) {
    const { name } = parseFieldSpec(opts.setField)
    if (protectedFields.has(name))
      deny(name, 'modify it')
  }
}

export async function showServiceSchema(opts: { projectRoot: string, servicesDir: string, name: string, format: 'show' | 'json', exportFile?: string }) {
  const manifest = await inferServiceManifest(opts.projectRoot, opts.servicesDir, opts.name)
  await writeServiceManifest(opts.servicesDir, manifest, { dry: false, force: true })
  const output = opts.format === 'json'
    ? `${JSON.stringify(manifest, null, 2)}\n`
    : `${renderManifestShow(manifest)}\n`
  if (opts.exportFile) {
    const exportPath = resolve(opts.projectRoot, opts.exportFile)
    await ensureDir(resolve(exportPath, '..'), false)
    await writeFile(exportPath, output, 'utf8')
    consola.success(`Exported schema view to ${relativeToCwd(exportPath)}`)
    return
  }
  process.stdout.write(output)
}

function inferIdFieldFromFields(fields: Record<string, ServiceSchemaField>, fallback: IdField): IdField {
  if ('_id' in fields)
    return '_id'
  if ('id' in fields)
    return 'id'
  return fallback
}

function pickCreateFieldMap(fields: Record<string, ServiceSchemaField>, idField: IdField) {
  return Object.fromEntries(Object.entries(fields).filter(([name]) => name !== idField))
}

function renderZodFieldExpression(field: ServiceSchemaField, adapter: Adapter) {
  let base = 'z.string()'
  switch (field.type) {
    case 'id':
      base = adapter === 'mongodb' ? 'objectIdSchema()' : 'z.number().int()'
      break
    case 'string':
      base = 'z.string()'
      break
    case 'number':
      base = 'z.number()'
      break
    case 'boolean':
      base = 'z.boolean()'
      break
    case 'date':
      base = 'z.date()'
      break
    case 'string[]':
      base = 'z.array(z.string())'
      break
    case 'number[]':
      base = 'z.array(z.number())'
      break
    case 'boolean[]':
      base = 'z.array(z.boolean())'
      break
    case 'array':
      base = 'z.array(z.any())'
      break
    case 'object':
      base = 'z.record(z.string(), z.any())'
      break
    default:
      base = 'z.string()'
  }
  if (field.default !== undefined)
    base += `.default(${JSON.stringify(field.default)})`
  if (field.required === false)
    base += '.optional()'
  return base
}

function renderSchemaFromManifest(ids: ReturnType<typeof createServiceIds>, adapter: Adapter, idField: IdField, schemaKind: SchemaKind, fields: Record<string, ServiceSchemaField>, auth = false, authAware?: boolean) {
  if (schemaKind === 'zod')
    return renderZodSchema(ids, adapter, idField, fields, auth, authAware)
  if (schemaKind === 'json')
    return renderJsonSchema(ids, adapter, idField, fields, auth, authAware)
  return ''
}

async function applyServiceManifest(opts: { servicesDir: string, manifest: ServiceManifest, dry: boolean, force: boolean }) {
  const next: ServiceManifest = {
    ...opts.manifest,
    idField: inferIdFieldFromFields(opts.manifest.schema.fields, opts.manifest.idField || (opts.manifest.adapter === 'mongodb' ? '_id' : 'id')),
  }

  const ids = createServiceIds(next.name)
  const dir = join(opts.servicesDir, next.name)
  const schemaFile = join(dir, `${next.name}.schema.ts`)
  const hooksFile = join(dir, `${next.name}.hooks.ts`)
  const classFile = join(dir, `${next.name}.class.ts`)
  const sharedFile = join(dir, `${next.name}.shared.ts`)
  const serviceFile = join(dir, `${next.name}.ts`)

  await ensureDir(dir, opts.dry)

  if (next.custom) {
    const methodList = next.methods?.filter(Boolean) || ['find']
    const stdMethods = methodList.filter(m => STD_SERVICE_METHODS.has(m))
    const customMethods = next.customMethods?.filter(Boolean) || methodList.filter(m => !STD_SERVICE_METHODS.has(m))
    await writeFileSafe(classFile, renderCustomClass(ids, stdMethods, customMethods, next.schema.mode), { dry: opts.dry, force: true })
    await writeFileSafe(sharedFile, renderCustomShared(ids, next.path, stdMethods, customMethods, next.schema.mode), { dry: opts.dry, force: true })
    await writeFileSafe(serviceFile, renderCustomService(ids, next.path, stdMethods, customMethods, next.auth, false, next.schema.mode), { dry: opts.dry, force: true })
    await writeFileSafe(hooksFile, renderEmptyHooks(ids), { dry: opts.dry, force: true })
  }
  else {
    await writeFileSafe(classFile, renderClass(ids, next.adapter, next.collectionName || next.path, next.schema.mode), { dry: opts.dry, force: true })
    await writeFileSafe(sharedFile, renderShared(ids, next.path, next.schema.mode), { dry: opts.dry, force: true })
    await writeFileSafe(serviceFile, renderService(ids, next.auth, false, next.schema.mode, next.authAware), { dry: opts.dry, force: true })
    if (next.schema.mode === 'none')
      await writeFileSafe(hooksFile, renderHooksNoSchema(ids, next.auth, next.authAware), { dry: opts.dry, force: true })
  }

  if (next.schema.mode === 'none') {
    if (opts.dry) {
      if (existsSync(schemaFile))
        consola.info(`[dry] remove ${relativeToCwd(schemaFile)}`)
    }
    else {
      await rm(schemaFile, { force: true })
    }
  }
  else {
    await writeFileSafe(
      schemaFile,
      renderSchemaFromManifest(ids, next.adapter, next.idField || (next.adapter === 'mongodb' ? '_id' : 'id'), next.schema.mode, next.schema.fields, next.auth, next.authAware),
      { dry: opts.dry, force: true },
    )
  }

  await writeServiceManifest(opts.servicesDir, next, { dry: opts.dry, force: true })
  return next
}

export async function setServiceSchemaMode(opts: { projectRoot: string, servicesDir: string, name: string, mode: SchemaKind, dry: boolean, force: boolean, diff?: boolean }) {
  const manifest = await inferServiceManifest(opts.projectRoot, opts.servicesDir, opts.name)
  enforceAuthSchemaGuard(manifest, opts.mode, opts.force)
  const next: ServiceManifest = {
    ...manifest,
    authAware: true,
    schema: {
      ...manifest.schema,
      mode: opts.mode,
    },
  }

  if (opts.diff)
    consola.box(`Schema diff for '${manifest.name}'\n${summarizeManifestDiff(manifest, next)}`)

  const applied = await applyServiceManifest({ servicesDir: opts.servicesDir, manifest: next, dry: opts.dry, force: opts.force })
  if (!opts.dry)
    consola.success(`Updated schema mode for '${applied.name}' -> ${opts.mode}`)
}

export async function mutateServiceFields(opts: {
  projectRoot: string
  servicesDir: string
  name: string
  addField?: string
  removeField?: string
  setField?: string
  renameField?: string
  dry: boolean
  force: boolean
  diff?: boolean
}) {
  const manifest = await inferServiceManifest(opts.projectRoot, opts.servicesDir, opts.name)
  enforceAuthFieldGuards(manifest, { removeField: opts.removeField, renameField: opts.renameField, setField: opts.setField, force: opts.force })
  const fields = { ...manifest.schema.fields }
  const actions: string[] = []

  if (opts.addField) {
    const { name, field } = parseFieldSpec(opts.addField)
    if (fields[name])
      throw new Error(`Field '${name}' already exists. Use --set-field to replace it.`)
    fields[name] = field
    actions.push(`add-field ${name}`)
  }

  if (opts.setField) {
    const { name, field } = parseFieldSpec(opts.setField)
    fields[name] = field
    actions.push(`set-field ${name}`)
  }

  if (opts.removeField) {
    const target = String(opts.removeField).trim()
    if (!fields[target])
      throw new Error(`Field '${target}' does not exist.`)
    delete fields[target]
    actions.push(`remove-field ${target}`)
  }

  if (opts.renameField) {
    const { from, to } = parseRenameFieldSpec(opts.renameField)
    if (!fields[from])
      throw new Error(`Field '${from}' does not exist.`)
    if (fields[to])
      throw new Error(`Field '${to}' already exists.`)
    const current = { ...fields[from] }
    delete fields[from]
    fields[to] = {
      ...current,
      ...(to.toLowerCase().includes('password') ? { secret: true } : {}),
    }
    actions.push(`rename-field ${from} -> ${to}`)
  }

  if (!actions.length)
    throw new Error('No field mutation requested. Use --add-field, --remove-field, --set-field or --rename-field.')

  const next: ServiceManifest = {
    ...manifest,
    authAware: true,
    schema: {
      ...manifest.schema,
      fields,
    },
  }

  if (opts.diff)
    consola.box(`Schema diff for '${manifest.name}'\n${summarizeManifestDiff(manifest, next)}`)

  const applied = await applyServiceManifest({ servicesDir: opts.servicesDir, manifest: next, dry: opts.dry, force: opts.force })
  if (!opts.dry)
    consola.success(`Updated fields for '${applied.name}': ${actions.join(', ')}`)
}


export async function validateServiceSchema(opts: { projectRoot: string, servicesDir: string, name: string, format?: 'show' | 'json' }) {
  const manifest = await inferServiceManifest(opts.projectRoot, opts.servicesDir, opts.name)
  await writeServiceManifest(opts.servicesDir, manifest, { dry: false, force: true })
  const auth = getAuthCompatibility(manifest)
  const payload = {
    service: manifest.name,
    ok: auth.ok,
    authApplicable: auth.applicable,
    issues: auth.issues,
    manifest,
  }

  if (opts.format === 'json') {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
  }
  else {
    if (auth.applicable) {
      process.stdout.write(`${auth.ok ? 'Schema validation: OK' : 'Schema validation: FAILED'}\n`)
      for (const issue of auth.issues)
        process.stdout.write(`- ${issue}\n`)
    }
    else {
      process.stdout.write('Schema validation: OK (no auth-specific invariants)\n')
    }
  }

  if (!auth.ok)
    throw new Error(`Schema validation failed for '${manifest.name}'.`)
}

export async function repairAuthServiceSchema(opts: { projectRoot: string, servicesDir: string, name: string, dry: boolean, diff?: boolean, force?: boolean }) {
  const manifest = await inferServiceManifest(opts.projectRoot, opts.servicesDir, opts.name)
  if (!(manifest.auth && manifest.name === 'users'))
    throw new Error(`--repair-auth is only supported for auth-enabled 'users' service.`)

  const next: ServiceManifest = {
    ...manifest,
    authAware: true,
    schema: {
      ...manifest.schema,
      mode: 'zod',
      fields: {
        ...manifest.schema.fields,
        userId: {
          type: 'string',
          required: true,
        },
        password: {
          type: 'string',
          required: true,
          secret: true,
        },
      },
    },
  }

  if (opts.diff)
    consola.box(`Schema diff for '${manifest.name}'\n${summarizeManifestDiff(manifest, next)}`)

  const applied = await applyServiceManifest({ servicesDir: opts.servicesDir, manifest: next, dry: opts.dry, force: true })
  if (!opts.dry)
    consola.success(`Repaired auth schema for '${applied.name}'`)
}

function normalizeServicePath(raw: string) {
  // Feathers service paths are usually kebab-case and can include slashes.
  // We keep user intent, but normalize leading/trailing slashes.
  const cleaned = String(raw).trim().replace(/^\/+/, '').replace(/\/+$/, '')
  if (!cleaned)
    throw new Error('Invalid --path: path cannot be empty')
  return cleaned
}

function normalizeCollectionName(raw: string) {
  // MongoDB collection names are strings, but in practice should not include path separators.
  // We keep it permissive while preventing common foot-guns.
  const cleaned = String(raw).trim()
  if (!cleaned)
    throw new Error('Invalid --collection: collection name cannot be empty')
  if (cleaned.includes('/') || cleaned.includes('\\')) {
    throw new Error('Invalid --collection: collection name must not include \/ or \\')
  }
  if (cleaned.includes('\u0000')) {
    throw new Error('Invalid --collection: collection name must not include null characters')
  }
  return cleaned
}

function createServiceIds(serviceNameKebab: string) {
  const baseKebab = singularize(serviceNameKebab)
  const basePascal = pascalCase(baseKebab)
  const baseCamel = basePascal.charAt(0).toLowerCase() + basePascal.slice(1)

  return {
    serviceNameKebab,
    baseKebab,
    basePascal,
    baseCamel,
  }
}

export interface GenerateServiceOptions {
  projectRoot: string
  servicesDir: string
  name: string
  adapter: Adapter
  auth: boolean
  idField: IdField
  servicePath?: string
  collectionName?: CollectionName
  docs: boolean
  schema: SchemaKind
  dry: boolean
  force: boolean
  custom?: boolean
  authAware?: boolean
  methods?: string
  customMethods?: string
}

export async function generateService(opts: GenerateServiceOptions) {
  if (opts.custom) {
    await generateCustomService({
      projectRoot: opts.projectRoot,
      servicesDir: opts.servicesDir,
      name: opts.name,
      auth: opts.auth,
      servicePath: opts.servicePath,
      methods: opts.methods,
      customMethods: opts.customMethods,
      docs: opts.docs,
      dry: opts.dry,
      force: opts.force,
      schema: opts.schema,
    })
    return
  }
  const serviceNameKebab = normalizeServiceName(opts.name)
  const authAware = resolveAuthAwareFlag(serviceNameKebab, opts.auth, opts.authAware)
  const ids = createServiceIds(serviceNameKebab)

  const servicePath = normalizeServicePath(opts.servicePath ?? serviceNameKebab)
  const collectionName = normalizeCollectionName(
    opts.collectionName
    ?? (servicePath.includes('/') ? serviceNameKebab : servicePath),
  )

  const dir = join(opts.servicesDir, serviceNameKebab)
  const schemaKind: SchemaKind = opts.schema ?? 'none'
  const schemaFile = join(dir, `${serviceNameKebab}.schema.ts`)
  const classFile = join(dir, `${serviceNameKebab}.class.ts`)
  const hooksFile = join(dir, `${serviceNameKebab}.hooks.ts`)
  const sharedFile = join(dir, `${serviceNameKebab}.shared.ts`)
  const serviceFile = join(dir, `${serviceNameKebab}.ts`)

  const files: Array<{ path: string, content: string }> = [
    ...(schemaKind === 'zod'
      ? [{ path: schemaFile, content: renderZodSchema(ids, opts.adapter, opts.idField, undefined, opts.auth, authAware) }]
      : schemaKind === 'json'
        ? [{ path: schemaFile, content: renderJsonSchema(ids, opts.adapter, opts.idField, undefined, opts.auth, authAware) }]
        : []),
    { path: classFile, content: renderClass(ids, opts.adapter, collectionName, schemaKind) },
    ...(schemaKind === 'none'
      ? [{ path: hooksFile, content: renderHooksNoSchema(ids, opts.auth, authAware) }]
      : []),
    { path: sharedFile, content: renderShared(ids, servicePath, schemaKind) },
    { path: serviceFile, content: renderService(ids, opts.auth, opts.docs, schemaKind, authAware) },
  ]

  await ensureDir(dir, opts.dry)

  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force })
  }

  if (opts.docs) {
    await ensureFeathersSwaggerSupport(opts.projectRoot, { dry: opts.dry, force: opts.force })
  }

  await writeServiceManifest(opts.servicesDir, {
    name: serviceNameKebab,
    path: servicePath,
    adapter: opts.adapter,
    auth: opts.auth,
    custom: false,
    authAware,
    idField: opts.idField,
    ...(opts.adapter === 'mongodb' ? { collectionName } : {}),
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    schema: {
      mode: schemaKind,
      fields: schemaKind === 'none'
        ? {}
        : schemaKind === 'zod'
          ? parseZodFields(renderZodSchema(ids, opts.adapter, opts.idField, undefined, opts.auth, authAware))
          : parseJsonFields(renderJsonSchema(ids, opts.adapter, opts.idField, undefined, opts.auth, authAware)),
    },
  }, { dry: opts.dry, force: true })

  if (!opts.dry) {
    consola.success(`Generated service '${serviceNameKebab}' in ${relativeToCwd(dir)}`)
  }
}

async function ensureFeathersSwaggerSupport(projectRoot: string, io: { dry: boolean, force: boolean }) {
  // 1) Ensure TS sees `ServiceOptions.docs` (required for feathers-swagger in TS projects)
  const typesDir = join(projectRoot, 'types')
  const typesFile = join(typesDir, 'feathers-swagger.d.ts')
  const typesContent = [
    '// Auto-generated by nuxt-feathers-zod CLI (required when using feathers-swagger in TypeScript)',
    '',
    "import type { ServiceSwaggerOptions } from 'feathers-swagger'",
    '',
    "declare module '@feathersjs/feathers' {",
    '  interface ServiceOptions {',
    '    docs?: ServiceSwaggerOptions',
    '  }',
    '}',
    '',
  ].join('\n')

  await ensureDir(typesDir, io.dry)
  if (existsSync(typesFile) && !io.force) {
    try {
      const existing = await readFile(typesFile, 'utf8')
      if (existing === typesContent) {
        if (io.dry) {
          consola.info(`[dry] keep existing ${relativeToCwd(typesFile)}`)
        }
      }
      else {
        consola.warn(
          `Keeping existing ${relativeToCwd(typesFile)} (use --force to overwrite).`,
        )
      }
    }
    catch {
      consola.warn(
        `Keeping existing ${relativeToCwd(typesFile)} (use --force to overwrite).`,
      )
    }
  }
  else {
    await writeFileSafe(typesFile, typesContent, { dry: io.dry, force: io.force })
  }

  // 2) Best-effort dependency hint (we do not auto-install dependencies)
  try {
    const pkgPath = join(projectRoot, 'package.json')
    if (!existsSync(pkgPath))
      return
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
    if (!deps['feathers-swagger']) {
      consola.warn(
        `--docs was used but 'feathers-swagger' is not listed in package.json. `
        + `Install it (and swagger UI deps if needed): `
        + `bun add feathers-swagger swagger-ui-dist`,
      )
    }
  }
  catch (e) {
    // ignore
  }
}

export interface GenerateMiddlewareOptions {
  projectRoot: string
  name: string
  target: MiddlewareTarget
  dry: boolean
  force: boolean
  preset?: string
}


export interface GenerateMongoComposeOptions {
  projectRoot: string
  outFile?: string
  serviceName?: string
  port?: number
  database?: string
  rootUser?: string
  rootPassword?: string
  volume?: string
  dry: boolean
  force: boolean
}

export interface ToggleServiceAuthOptions {
  projectRoot: string
  servicesDir: string
  name: string
  enabled: boolean
  dry: boolean
}

export interface GenerateCustomServiceOptions {
  projectRoot: string
  servicesDir: string
  name: string
  auth: boolean
  servicePath?: string
  /**
   * CSV list of standard Feathers methods to implement/register.
   * Default: "find"
   */
  methods?: string
  /**
   * CSV list of custom methods to expose (e.g. "run").
   * Default: "run"
   */
  customMethods?: string
  docs: boolean
  dry: boolean
  force: boolean
  schema?: SchemaKind
}

const STD_SERVICE_METHODS = new Set([
  'find',
  'get',
  'create',
  'update',
  'patch',
  'remove',
])

export async function generateCustomService(opts: GenerateCustomServiceOptions) {
  const serviceNameKebab = normalizeServiceName(opts.name)
  const ids = createServiceIds(serviceNameKebab)

  const servicePath = normalizeServicePath(opts.servicePath ?? serviceNameKebab)

  const stdMethods = parseCsvMethods(opts.methods ?? 'find')
  const customMethods = parseCsvMethods(opts.customMethods ?? 'run').filter(m => !STD_SERVICE_METHODS.has(m))

  // Always ensure at least one method is registered (Feathers requirement)
  if (stdMethods.length === 0 && customMethods.length === 0) {
    throw new Error('Custom service must register at least one method. Use --methods and/or --customMethods.')
  }

  // Ensure "find" exists if user did not provide any standard methods (helps with SSR-safe registration)
  if (stdMethods.length === 0)
    stdMethods.push('find')

  const dir = join(opts.servicesDir, serviceNameKebab)
  const schemaKind: SchemaKind = opts.schema ?? 'none'
  const schemaFile = join(dir, `${serviceNameKebab}.schema.ts`)
  const classFile = join(dir, `${serviceNameKebab}.class.ts`)
  const sharedFile = join(dir, `${serviceNameKebab}.shared.ts`)
  const serviceFile = join(dir, `${serviceNameKebab}.ts`)

  const hooksFile = join(dir, `${serviceNameKebab}.hooks.ts`)

  const files: Array<{ path: string, content: string }> = [
    { path: classFile, content: renderCustomClass(ids, stdMethods, customMethods, schemaKind) },
    { path: sharedFile, content: renderCustomShared(ids, servicePath, stdMethods, customMethods, schemaKind) },
    {
      path: serviceFile,
      content: renderCustomService(ids, servicePath, stdMethods, customMethods, opts.auth, opts.docs, schemaKind),
    },
    { path: hooksFile, content: renderEmptyHooks(ids) },
  ]

  if (schemaKind === 'zod') {
    files.unshift({ path: schemaFile, content: renderCustomSchema(ids, stdMethods, customMethods) })
  }

  await ensureDir(dir, opts.dry)

  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force })
  }

  if (opts.docs) {
    await ensureFeathersSwaggerSupport(opts.projectRoot, { dry: opts.dry, force: opts.force })
  }

  await writeServiceManifest(opts.servicesDir, {
    name: serviceNameKebab,
    path: servicePath,
    adapter: 'memory',
    auth: opts.auth,
    custom: true,
    methods: uniq([...stdMethods, ...customMethods]),
    customMethods,
    schema: {
      mode: schemaKind,
      fields: schemaKind === 'zod' ? parseZodFields(renderCustomSchema(ids, stdMethods, customMethods)) : {},
    },
  }, { dry: opts.dry, force: true })

  if (!opts.dry) {
    consola.success(`Generated adapter-less service '${serviceNameKebab}' in ${relativeToCwd(dir)}`)
  }
}

function parseCsvMethods(value: string) {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function uniq(arr: string[]) {
  return [...new Set(arr)]
}

function uniqCaseInsensitive(arr: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of arr) {
    const key = String(v).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

function isValidIdentifier(name: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}

function safeMethodName(name: string) {
  // custom methods should still be valid JS identifiers
  return isValidIdentifier(name) ? name : kebabCase(name).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}


function renderMongoComposeFile(opts: GenerateMongoComposeOptions) {
  const serviceName = opts.serviceName || 'mongodb'
  const port = opts.port || 27017
  const database = opts.database || 'app'
  const rootUser = opts.rootUser || 'root'
  const rootPassword = opts.rootPassword || 'change-me'
  const volume = opts.volume || 'mongodb_data'

  return `services:
  ${serviceName}:
    image: mongo:7
    container_name: ${serviceName}
    restart: unless-stopped
    ports:
      - '${port}:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${rootUser}
      MONGO_INITDB_ROOT_PASSWORD: ${rootPassword}
      MONGO_INITDB_DATABASE: ${database}
    volumes:
      - ${volume}:/data/db

volumes:
  ${volume}:
`
}

export async function generateMongoCompose(opts: GenerateMongoComposeOptions) {
  const outFile = opts.outFile || 'docker-compose-db.yaml'
  const outPath = join(opts.projectRoot, outFile)
  const content = renderMongoComposeFile(opts)
  await writeFileSafe(outPath, content, { dry: opts.dry, force: opts.force })
  if (!opts.dry)
    consola.success(`Generated MongoDB compose file in ${relativeToCwd(outPath)}`)
}

function withAuthImport(content: string, enabled: boolean) {
  const importLine = "import { authenticate } from '@feathersjs/authentication'\n"
  const hasImport = content.includes(importLine)

  if (enabled && !hasImport) {
    if (/import type \{ Application \} from 'nuxt-feathers-zod\/server'\n/.test(content))
      return content.replace(/import type \{ Application \} from 'nuxt-feathers-zod\/server'\n/, `${importLine}import type { Application } from 'nuxt-feathers-zod/server'\n`)
    return `${importLine}${content}`
  }

  if (!enabled && hasImport)
    return content.replace(importLine, '')

  return content
}

function withMethodAuthBlocks(content: string, enabled: boolean) {
  const replacements = {
    find: enabled ? "find: [authenticate('jwt')]" : 'find: []',
    get: enabled ? "get: [authenticate('jwt')]" : 'get: []',
    create: 'create: []',
    patch: enabled ? "patch: [authenticate('jwt')]" : 'patch: []',
    remove: enabled ? "remove: [authenticate('jwt')]" : 'remove: []',
    update: enabled ? "update: [authenticate('jwt')]" : 'update: []',
  }

  let out = content
  for (const [method, replacement] of Object.entries(replacements)) {
    const re = new RegExp(String.raw`(^\s*)${method}:\s*\[(?:[^\]]*)\]`, 'm')
    if (re.test(out))
      out = out.replace(re, `$1${replacement}`)
  }

  if (/before:\s*\{[\s\S]*?all:\s*\[(?:[^\]]*)\]/m.test(out)) {
    out = out.replace(/(^\s*)all:\s*\[(?:[^\]]*)\]/m, (_m, indent) => `${indent}all: ${enabled ? "[authenticate('jwt')]" : '[]'}`)
  }

  return out
}

export async function toggleServiceAuth(opts: ToggleServiceAuthOptions) {
  const serviceNameKebab = normalizeServiceName(opts.name)
  const dir = join(opts.servicesDir, serviceNameKebab)
  const hooksFile = join(dir, `${serviceNameKebab}.hooks.ts`)
  const serviceFile = join(dir, `${serviceNameKebab}.ts`)

  const target = existsSync(hooksFile) ? hooksFile : serviceFile
  if (!existsSync(target))
    throw new Error(`Service file not found for '${serviceNameKebab}' in ${relativeToCwd(dir)}`)

  let content = await readFile(target, 'utf8')
  content = withAuthImport(content, opts.enabled)
  content = withMethodAuthBlocks(content, opts.enabled)

  if (opts.dry) {
    consola.info(`[dry] Updated auth hooks for ${relativeToCwd(target)} (enabled=${opts.enabled})`)
    return
  }

  await writeFile(target, content, 'utf8')
  consola.success(`Updated auth hooks for service '${serviceNameKebab}' in ${relativeToCwd(target)}`)
}

export async function generateMiddleware(opts: GenerateMiddlewareOptions) {
  const fileBase = kebabCase(opts.name)

  if (opts.target === 'client-module') {
    const dir = join(opts.projectRoot, 'app', 'plugins')
    const file = join(dir, `${fileBase}.client.ts`)
    await ensureDir(dir, opts.dry)
    await writeFileSafe(file, renderClientFeathersModule(fileBase), { dry: opts.dry, force: opts.force })
    if (!opts.dry)
      consola.success(`Generated Feathers client module '${fileBase}' in ${relativeToCwd(file)}`)
    return
  }

  if (opts.target === 'hook') {
    const dir = join(opts.projectRoot, 'server', 'feathers', 'hooks')
    const file = join(dir, `${fileBase}.ts`)
    await ensureDir(dir, opts.dry)
    await writeFileSafe(file, renderFeathersHook(fileBase), { dry: opts.dry, force: opts.force })
    if (!opts.dry)
      consola.success(`Generated Feathers hook '${fileBase}' in ${relativeToCwd(file)}`)
    return
  }

  if (opts.target === 'policy') {
    const dir = join(opts.projectRoot, 'server', 'feathers', 'policies')
    const file = join(dir, `${fileBase}.ts`)
    await ensureDir(dir, opts.dry)
    await writeFileSafe(file, renderFeathersPolicy(fileBase), { dry: opts.dry, force: opts.force })
    if (!opts.dry)
      consola.success(`Generated Feathers policy '${fileBase}' in ${relativeToCwd(file)}`)
    return
  }

  if (opts.target === 'nitro') {
    const dir = join(opts.projectRoot, 'server', 'middleware')
    const file = join(dir, `${fileBase}.ts`)
    await ensureDir(dir, opts.dry)
    await writeFileSafe(file, renderNitroMiddleware(fileBase), { dry: opts.dry, force: opts.force })
    if (!opts.dry)
      consola.success(`Generated Nitro middleware '${fileBase}' in ${relativeToCwd(file)}`)
    return
  }

  if (opts.target === 'server-module' || opts.target === 'module') {
    const dir = join(opts.projectRoot, 'server', 'feathers', 'modules')
    await ensureDir(dir, opts.dry)

    if (opts.preset === 'express-baseline') {
      const presets = getExpressServerModulePresetFiles()
      for (const entry of presets) {
        const file = join(dir, `${entry.name}.ts`)
        await writeFileSafe(file, entry.content, { dry: opts.dry, force: opts.force })
      }
      if (!opts.dry)
        consola.success(
          `Generated Express baseline server modules (${presets.map(p => p.name).join(', ')}) in ${relativeToCwd(dir)}`,
        )
      return
    }

    const file = join(dir, `${fileBase}.ts`)
    const content = opts.preset ? renderServerModulePreset(opts.preset, fileBase) : renderServerModule(fileBase)
    await writeFileSafe(file, content, { dry: opts.dry, force: opts.force })
    if (!opts.dry)
      consola.success(`Generated Feathers server module '${fileBase}' in ${relativeToCwd(file)}`)
    return
  }

  // feathers target: generate a server plugin under server/feathers
  const dir = join(opts.projectRoot, 'server', 'feathers')
  const file = join(dir, `${fileBase}.ts`)
  await ensureDir(dir, opts.dry)
  await writeFileSafe(file, renderFeathersPlugin(fileBase), { dry: opts.dry, force: opts.force })
  if (!opts.dry)
    consola.success(`Generated Feathers server plugin '${fileBase}' in ${relativeToCwd(file)}`)
}

async function ensureDir(dir: string, dry: boolean) {
  if (dry)
    return
  await mkdir(dir, { recursive: true })
}

async function writeFileSafe(path: string, content: string, opts: { dry: boolean, force: boolean }) {
  if (!opts.force && existsSync(path)) {
    throw new Error(`File already exists: ${path} (use --force to overwrite)`)
  }

  if (opts.dry) {
    consola.info(`[dry] write ${relativeToCwd(path)}`)
    return
  }

  await writeFile(path, content, 'utf8')
}

function relativeToCwd(p: string) {
  try {
    return p.replace(`${resolve(process.cwd())}/`, '')
  }
  catch (e) {
    return p
  }
}


function resolveAuthAwareFlag(serviceNameKebab: string, auth: boolean, authAware?: boolean) {
  if (!auth)
    return false
  if (authAware !== undefined)
    return Boolean(authAware)
  return serviceNameKebab === 'users'
}

function isAuthUsersService(ids: ReturnType<typeof createServiceIds>, auth: boolean, authAware?: boolean) {
  return resolveAuthAwareFlag(ids.serviceNameKebab, auth, authAware)
}

function renderAuthUsersZodSchema(
  ids: ReturnType<typeof createServiceIds>,
  adapter: Adapter,
  idField: IdField,
  fields?: Record<string, ServiceSchemaField>,
  authAware = true,
) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`
  const fieldMap: Record<string, ServiceSchemaField> = fields && Object.keys(fields).length
    ? fields
    : {
        [idField]: { type: adapter === 'mongodb' ? 'id' : 'number', required: true },
        userId: { type: 'string', required: true },
        password: { type: 'string', required: true, secret: true },
      }

  const schemaEntries = Object.entries(fieldMap)
  const idSchema = adapter === 'mongodb' || Object.values(fieldMap).some(field => field.type === 'id')
    ? `
const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')
`
    : ''

  const mainSchema = schemaEntries
    .map(([name, field]) => `  ${name}: ${renderZodFieldExpression(field, adapter)},`)
    .join('\n')

  const queryPick = fieldMap.userId
    ? `{ ${idField}: true, userId: true }`
    : `{ ${idField}: true }`

  const patchResolver = fieldMap.password
    ? `
export const ${base}PatchResolver = resolve<${Base}, any>({
  password: passwordHash({ strategy: 'local' }),
})
`
    : `
export const ${base}PatchResolver = resolve<${Base}, HookContext<${serviceClass}>>({})
`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { passwordHash } from '@feathersjs/authentication-local'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
${idSchema}// Main data model schema
export const ${base}Schema = z.object({
${mainSchema}
})
export type ${Base} = z.infer<typeof ${base}Schema>
export const ${base}Validator = getZodValidator(${base}Schema, { kind: 'data' })
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})

export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({
  password: async () => undefined,
})

// Schema for creating new entries
export const ${base}DataSchema = ${base}Schema.pick({
  userId: true,
  password: true,
})
export type ${Base}Data = z.infer<typeof ${base}DataSchema>
export const ${base}DataValidator = getZodValidator(${base}DataSchema, { kind: 'data' })
export const ${base}DataResolver = resolve<${Base}, any>({
  password: passwordHash({ strategy: 'local' }),
})

// Schema for updating existing entries
export const ${base}PatchSchema = ${base}Schema.partial()
export type ${Base}Patch = z.infer<typeof ${base}PatchSchema>
export const ${base}PatchValidator = getZodValidator(${base}PatchSchema, { kind: 'data' })${patchResolver}

// Schema for allowed query properties
export const ${base}QuerySchema = zodQuerySyntax(${base}Schema.pick(${queryPick}))
export type ${Base}Query = z.infer<typeof ${base}QuerySchema>
export const ${base}QueryValidator = getZodValidator(${base}QuerySchema, { kind: 'query' })
export const ${base}QueryResolver = resolve<${Base}Query, HookContext<${serviceClass}>>({
  ${idField}: async (value: unknown, _user: unknown, context: HookContext<${serviceClass}>) => {
    const authUser = (context.params as any).user
    if (authUser && authUser.${idField} != null)
      return authUser.${idField}
    return value
  },
})
`
}

function renderJsonField(field: ServiceSchemaField, adapter: Adapter) {
  const type = field.type === 'id'
    ? (adapter === 'mongodb' ? 'string' : 'number')
    : (field.type.endsWith('[]') ? 'array' : field.type === 'date' ? 'string' : field.type)

  const pieces = [`type: '${type}'`]
  if (field.default !== undefined)
    pieces.push(`default: ${JSON.stringify(field.default)}`)

  return `{ ${pieces.join(', ')} }`
}

function renderJsonProperties(fields: Record<string, ServiceSchemaField>, adapter: Adapter) {
  return Object.entries(fields)
    .map(([name, field]) => `    ${name}: ${renderJsonField(field, adapter)},`)
    .join('\n')
}

function jsonRequired(fields: Record<string, ServiceSchemaField>) {
  return Object.entries(fields)
    .filter(([, field]) => field.required !== false)
    .map(([name]) => `'${name}'`)
    .join(', ')
}

function renderAuthUsersJsonSchema(
  ids: ReturnType<typeof createServiceIds>,
  adapter: Adapter,
  idField: IdField,
  fields?: Record<string, ServiceSchemaField>,
  authAware = true,
) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`
  const fieldMap: Record<string, ServiceSchemaField> = fields && Object.keys(fields).length
    ? fields
    : {
        [idField]: { type: adapter === 'mongodb' ? 'id' : 'number', required: true },
        userId: { type: 'string', required: true },
        password: { type: 'string', required: true, secret: true },
      }

  const properties = renderJsonProperties(fieldMap, adapter)
  const createFields = pickCreateFieldMap(fieldMap, idField)
  const dataProperties = renderJsonProperties(createFields, adapter)
  const required = jsonRequired(createFields)
  const patchProperties = renderJsonProperties(fieldMap, adapter)
  const queryProperties = [
    `${idField}: ${renderJsonField(fieldMap[idField] || { type: adapter === 'mongodb' ? 'id' : 'number', required: true }, adapter)}`,
    fieldMap.userId ? `userId: ${renderJsonField(fieldMap.userId, adapter)}` : '',
  ].filter(Boolean).join(',\n    ')

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { passwordHash } from '@feathersjs/authentication-local'
import { resolve } from '@feathersjs/schema'
import { Ajv, addFormats, getValidator, querySyntax } from '@feathersjs/schema'
import type { FormatsPluginOptions } from '@feathersjs/schema'

const formats: FormatsPluginOptions = [
  'date-time', 'time', 'date', 'email', 'hostname', 'ipv4', 'ipv6', 'uri', 'uri-reference', 'uuid', 'uri-template', 'json-pointer', 'relative-json-pointer', 'regex',
]
const dataValidatorAjv: Ajv = addFormats(new Ajv({}), formats)
const queryValidatorAjv: Ajv = addFormats(new Ajv({ coerceTypes: true }), formats)

export const ${base}Schema = {
  $id: '${Base}',
  type: 'object',
  additionalProperties: true,
  properties: {
    ${properties}
  },
} as const
export type ${Base} = Record<string, any>
export const ${base}Validator = getValidator(${base}Schema as any, dataValidatorAjv)
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})
export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({
  password: async () => undefined,
})

export const ${base}DataSchema = {
  $id: '${Base}Data',
  type: 'object',
  additionalProperties: true,
  required: ${required},
  properties: {
    ${dataProperties}
  },
} as const
export type ${Base}Data = Record<string, any>
export const ${base}DataValidator = getValidator(${base}DataSchema as any, dataValidatorAjv)
export const ${base}DataResolver = resolve<${Base}, any>({
  password: passwordHash({ strategy: 'local' }),
})

export const ${base}PatchSchema = {
  $id: '${Base}Patch',
  type: 'object',
  additionalProperties: true,
  properties: {
    ${patchProperties}
  },
} as const
export type ${Base}Patch = Partial<${Base}>
export const ${base}PatchValidator = getValidator(${base}PatchSchema as any, dataValidatorAjv)
export const ${base}PatchResolver = resolve<${Base}, any>({
  password: passwordHash({ strategy: 'local' }),
})

export const ${base}QueryProperties = {
    ${queryProperties}
} as const
export const ${base}QuerySchema = querySyntax(${base}QueryProperties, { additionalProperties: false })
export type ${Base}Query = Record<string, any>
export const ${base}QueryValidator = getValidator(${base}QuerySchema as any, queryValidatorAjv)
export const ${base}QueryResolver = resolve<${Base}Query, HookContext<${serviceClass}>>({
  ${idField}: async (value: unknown, _user: unknown, context: HookContext<${serviceClass}>) => {
    const authUser = (context.params as any).user
    if (authUser && authUser.${idField} != null)
      return authUser.${idField}
    return value
  },
})
`
}

function renderZodSchema(
  ids: ReturnType<typeof createServiceIds>,
  adapter: Adapter,
  idField: IdField,
  fields?: Record<string, ServiceSchemaField>,
  auth = false,
  authAware?: boolean,
) {
  if (isAuthUsersService(ids, auth, authAware))
    return renderAuthUsersZodSchema(ids, adapter, idField, fields, authAware)
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

  const fieldMap: Record<string, ServiceSchemaField> = fields && Object.keys(fields).length
    ? fields
    : {
        [idField]: { type: adapter === 'mongodb' ? 'id' : 'number', required: true },
        text: { type: 'string', required: true },
      }

  const schemaEntries = Object.entries(fieldMap)
  const createFields = pickCreateFieldMap(fieldMap, idField)
  const queryFields = Object.fromEntries(schemaEntries.filter(([name]) => name === idField || name === 'text' || name === 'userId'))

  const idSchema = adapter === 'mongodb' || Object.values(fieldMap).some(field => field.type === 'id')
    ? `
const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')
`
    : ''

  const mainSchema = schemaEntries
    .map(([name, field]) => `  ${name}: ${renderZodFieldExpression(field, adapter)},`)
    .join('\n')

  const pickCreate = Object.keys(createFields).length
    ? `{ ${Object.keys(createFields).map(name => `${name}: true`).join(', ')} }`
    : '{}'

  const queryPick = Object.keys(queryFields).length
    ? `{ ${Object.keys(queryFields).map(name => `${name}: true`).join(', ')} }`
    : `{ ${idField}: true }`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
${idSchema}
// Main data model schema
export const ${base}Schema = z.object({
${mainSchema}
})
export type ${Base} = z.infer<typeof ${base}Schema>
export const ${base}Validator = getZodValidator(${base}Schema, { kind: 'data' })
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})

export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for creating new entries
export const ${base}DataSchema = ${base}Schema.pick(${pickCreate})
export type ${Base}Data = z.infer<typeof ${base}DataSchema>
export const ${base}DataValidator = getZodValidator(${base}DataSchema, { kind: 'data' })
export const ${base}DataResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for updating existing entries
export const ${base}PatchSchema = ${base}Schema.partial()
export type ${Base}Patch = z.infer<typeof ${base}PatchSchema>
export const ${base}PatchValidator = getZodValidator(${base}PatchSchema, { kind: 'data' })
export const ${base}PatchResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for allowed query properties
export const ${base}QuerySchema = zodQuerySyntax(${base}Schema.pick(${queryPick}))
export type ${Base}Query = z.infer<typeof ${base}QuerySchema>
export const ${base}QueryValidator = getZodValidator(${base}QuerySchema, { kind: 'query' })
export const ${base}QueryResolver = resolve<${Base}Query, HookContext<${serviceClass}>>({})
`
}

function renderClass(
  ids: ReturnType<typeof createServiceIds>,
  adapter: Adapter,
  collectionName: string,
  schemaKind: SchemaKind,
) {
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  const paramsName = `${Base}Params`

  if (schemaKind === 'none') {
    return renderClassNoSchema(ids, adapter, collectionName)
  }

  if (adapter === 'memory') {
    return [
      '// For more information about this file see',
      '// https://dove.feathersjs.com/guides/cli/service.class.html#custom-services',
      '',
    ].join('\n') + `

import type { Params } from '@feathersjs/feathers'
import type { MemoryServiceOptions } from '@feathersjs/memory'
import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query } from './${serviceName}.schema'
import { MemoryService } from '@feathersjs/memory'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export interface ${paramsName} extends Params<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MemoryService<
  ${Base},
  ${Base}Data
> {}

export function getOptions(app: Application): MemoryServiceOptions<${Base}> {
  return {
    multi: true,
  }
}
`
  }

  // mongodb
  return [
    '// For more information about this file see',
    '// https://dove.feathersjs.com/guides/cli/service.class.html#database-services',
    '',
  ].join('\n') + `

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query } from './${serviceName}.schema'
import { MongoDBService } from '@feathersjs/mongodb'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export interface ${paramsName} extends MongoDBAdapterParams<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MongoDBService<
  ${Base},
  ${Base}Data,
  ${paramsName},
  ${Base}Patch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient') as Promise<{ collection: (name: string) => any }> | undefined

  if (!mongoClient || typeof (mongoClient as any).then !== 'function') {
    throw new Error(
      '[nuxt-feathers-zod] Service \\\'${collectionName}\\\' uses adapter \\\'mongodb\\\' but app.get(\\\'mongodbClient\\\') is not configured. '
      + 'Enable feathers.database.mongo in embedded mode, or regenerate this service with --adapter memory.',
    )
  }

  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then(db => db.collection('${collectionName}')),
  }
}
`
}


function renderJsonSchema(
  ids: ReturnType<typeof createServiceIds>,
  adapter: Adapter,
  idField: IdField,
  fields?: Record<string, ServiceSchemaField>,
  auth = false,
  authAware?: boolean,
) {
  if (isAuthUsersService(ids, auth, authAware))
    return renderAuthUsersJsonSchema(ids, adapter, idField, fields, authAware)
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

  const fieldMap: Record<string, ServiceSchemaField> = fields && Object.keys(fields).length
    ? fields
    : {
        [idField]: { type: adapter === 'mongodb' ? 'id' : 'number', required: true },
        text: { type: 'string', required: true },
      }

  const props = Object.entries(fieldMap)
    .map(([name, field]) => {
      const type = field.type === 'id' ? (adapter === 'mongodb' ? 'string' : 'number') : (field.type.endsWith('[]') ? 'array' : field.type === 'date' ? 'string' : field.type)
      const pieces = [`type: '${type}'`]
      if (field.default !== undefined)
        pieces.push(`default: ${JSON.stringify(field.default)}`)
      return `    ${name}: { ${pieces.join(', ')} },`
    })
    .join('\n')

  const createFields = Object.entries(fieldMap).filter(([name]) => name !== idField)
  const createProps = createFields
    .map(([name, field]) => {
      const type = field.type === 'id' ? (adapter === 'mongodb' ? 'string' : 'number') : (field.type.endsWith('[]') ? 'array' : field.type === 'date' ? 'string' : field.type)
      const pieces = [`type: '${type}'`]
      if (field.default !== undefined)
        pieces.push(`default: ${JSON.stringify(field.default)}`)
      return `    ${name}: { ${pieces.join(', ')} },`
    })
    .join('\n')
  const requiredCreate = createFields.filter(([, field]) => field.required !== false).map(([name]) => `'${name}'`)

  const idSchema = adapter === 'mongodb' || Object.values(fieldMap).some(field => field.type === 'id')
    ? `
const objectIdRegex = '^[0-9a-f]{24}$'
`
    : ''

  const queryFields = Object.entries(fieldMap).filter(([name]) => name === idField || name === 'text' || name === 'userId')
  const queryProps = (queryFields.length ? queryFields : Object.entries(fieldMap).filter(([name]) => name === idField))
    .map(([name, field]) => {
      const type = field.type === 'id' ? (adapter === 'mongodb' ? 'string' : 'number') : (field.type.endsWith('[]') ? 'array' : field.type === 'date' ? 'string' : field.type)
      const pieces = [`type: '${type}'`]
      if (field.default !== undefined)
        pieces.push(`default: ${JSON.stringify(field.default)}`)
      return `    ${name}: { ${pieces.join(', ')} },`
    })
    .join('\n')

  return `// JSON Schema variant (generated by nuxt-feathers-zod CLI)
// For more information about Feathers schemas see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { resolve } from '@feathersjs/schema'
import { getValidator, querySyntax } from '@feathersjs/schema'
import { addFormats, Ajv } from '@feathersjs/schema'
import type { FormatsPluginOptions } from '@feathersjs/schema'
${idSchema}
const formats: FormatsPluginOptions = [
  'date-time',
  'time',
  'date',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uri',
  'uri-reference',
  'uuid',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
]

const dataValidatorAjv: Ajv = addFormats(new Ajv({}), formats)
const queryValidatorAjv: Ajv = addFormats(new Ajv({ coerceTypes: true }), formats)

// Main data model JSON schema
export const ${base}Schema = {
  $id: '${Base}',
  type: 'object',
  additionalProperties: true,
  properties: {
${props}
  },
} as const

export type ${Base} = Record<string, any>

export const ${base}Validator = getValidator(${base}Schema as any, dataValidatorAjv)
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})
export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for creating new entries
export const ${base}DataSchema = {
  ...${base}Schema,
  $id: '${Base}Data',
  required: [${requiredCreate.join(', ')}],
  properties: {
${createProps}
  },
} as const

export type ${Base}Data = Record<string, any>

export const ${base}DataValidator = getValidator(${base}DataSchema as any, dataValidatorAjv)
export const ${base}DataResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for updating existing entries
export const ${base}PatchSchema = {
  ...${base}Schema,
  $id: '${Base}Patch',
} as const

export type ${Base}Patch = Partial<${Base}>
export const ${base}PatchValidator = getValidator(${base}PatchSchema as any, dataValidatorAjv)
export const ${base}PatchResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for allowed query properties
export const ${base}QueryProperties = {
${queryProps}
} as const
export const ${base}QuerySchema = querySyntax(${base}QueryProperties as any, {
  additionalProperties: false,
})
export type ${Base}Query = Record<string, any>
export const ${base}QueryValidator = getValidator(${base}QuerySchema as any, queryValidatorAjv)
export const ${base}QueryResolver = resolve<${Base}Query, HookContext<${serviceClass}>>({})
`
}

function renderClassNoSchema(ids: ReturnType<typeof createServiceIds>, adapter: Adapter, collectionName: string) {
  const Base = ids.basePascal
  // no schema
  const serviceClass = `${Base}Service`
  const paramsName = `${Base}Params`

  if (adapter === 'memory') {
    return `${[
      '// For more information about this file see',
      '// https://dove.feathersjs.com/guides/cli/service.class.html#custom-services',
      '',
    ].join('\n')}

import type { Params } from '@feathersjs/feathers'
import type { MemoryServiceOptions } from '@feathersjs/memory'
import type { Application } from 'nuxt-feathers-zod/server'
import { MemoryService } from '@feathersjs/memory'

// No schema generated (schemaKind=none). Use Record<string, any> for types.
export type ${Base} = Record<string, any>
export type ${Base}Data = Partial<${Base}>
export type ${Base}Patch = Partial<${Base}>
export type ${Base}Query = Record<string, any>

export interface ${paramsName} extends Params<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MemoryService<
  ${Base},
  ${Base}Data
> {}

export function getOptions(app: Application): MemoryServiceOptions<${Base}> {
  return {
    multi: true,
  }
}
`
  }

  return `${[
    '// For more information about this file see',
    '// https://dove.feathersjs.com/guides/cli/service.class.html#database-services',
    '',
  ].join('\n')}

import type { Params } from '@feathersjs/feathers'
import type { MongoDBAdapterOptions, MongoDBAdapterParams } from '@feathersjs/mongodb'
import type { Application } from 'nuxt-feathers-zod/server'
import { MongoDBService } from '@feathersjs/mongodb'

// No schema generated (schemaKind=none). Use Record<string, any> for types.
export type ${Base} = Record<string, any>
export type ${Base}Data = Partial<${Base}>
export type ${Base}Patch = Partial<${Base}>
export type ${Base}Query = Record<string, any>

export interface ${paramsName} extends MongoDBAdapterParams<${Base}Query> {}

export class ${serviceClass}<ServiceParams extends Params = ${paramsName}> extends MongoDBService<
  ${Base},
  ${Base}Data,
  ${paramsName},
  ${Base}Patch
> {}

export function getOptions(app: Application): MongoDBAdapterOptions {
  const mongoClient = app.get('mongodbClient') as Promise<{ collection: (name: string) => any }> | undefined

  if (!mongoClient || typeof (mongoClient as any).then !== 'function') {
    throw new Error(
      '[nuxt-feathers-zod] Service \\\'${collectionName}\\\' uses adapter \\\'mongodb\\\' but app.get(\\\'mongodbClient\\\') is not configured. '
      + 'Enable feathers.database.mongo in embedded mode, or regenerate this service with --adapter memory.',
    )
  }

  return {
    paginate: {
      default: 10,
      max: 100,
    },
    multi: true,
    Model: mongoClient.then(db => db.collection('${collectionName}')),
  }
}
`
}




function renderShared(ids: ReturnType<typeof createServiceIds>, servicePath: string, schemaKind: SchemaKind) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  const methodsConst = `${base}Methods`
  const pathConst = `${base}Path`
  const clientFn = `${base}Client`
  const clientServiceType = `${Base}ClientService`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.shared.html

import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query, ${serviceClass} } from './${serviceName}.class'

export type { ${Base}, ${Base}Data, ${Base}Patch, ${Base}Query }

export type ${clientServiceType} = Pick<${serviceClass}<Params<${Base}Query>>, (typeof ${methodsConst})[number]>

export const ${pathConst} = '${servicePath}'

export const ${methodsConst}: Array<keyof ${serviceClass}> = ['find', 'get', 'create', 'patch', 'remove']

export function ${clientFn}(client: ClientApplication) {
  const connection = client.get('connection')

  client.use(${pathConst}, connection.service(${pathConst}), {
    methods: ${methodsConst},
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [${pathConst}]: ${clientServiceType}
  }
}
`
}

function renderService(ids: ReturnType<typeof createServiceIds>, auth: boolean, docs: boolean, schemaKind: SchemaKind, authAware?: boolean) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  if (schemaKind === 'none') {
    return renderServiceNoSchema(ids, auth, docs, authAware)
  }

  const authImports = auth ? 'import { authenticate } from \'@feathersjs/authentication\'\n' : ''

  const swaggerImports = ''

  const swaggerSchemaImports = ''
  const docsBlock = docs
    ? `
    docs: {
      description: '${Base} service',
      idType: 'string',
${auth
  ? `      securities: ${base}Methods,
`
  : ''}      definitions: {
        ${base}: { type: 'object', properties: {} },
        ${base}Data: { type: 'object', properties: {} },
        ${base}Patch: { type: 'object', properties: {} },
        ${base}Query: {
          type: 'object',
          properties: {
            $limit: { type: 'number' },
            $skip: { type: 'number' },
            $sort: { type: 'object', additionalProperties: { type: 'number' } },
          },
        },
      },
    },
`
    : ''

  const authAround = auth
    ? `
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')],
`
    : `
      find: [],
      get: [],
      create: [],
      patch: [],
      remove: [],
`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from 'nuxt-feathers-zod/server'
${authImports}${swaggerImports}import { hooks as schemaHooks } from '@feathersjs/schema'
import { getOptions, ${serviceClass} } from './${serviceName}.class'
import {
${swaggerSchemaImports}  ${base}DataResolver,
  ${base}DataValidator,
  ${base}ExternalResolver,
  ${base}PatchResolver,
  ${base}PatchValidator,
  ${base}QueryResolver,
  ${base}QueryValidator,
  ${base}Resolver,
} from './${serviceName}.schema'
import { ${base}Methods, ${base}Path } from './${serviceName}.shared'

export * from './${serviceName}.class'
export * from './${serviceName}.schema'

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(getOptions(app)), {
    methods: ${base}Methods,
    events: [],${docsBlock}
  })

  app.service(${base}Path).hooks({
    around: {
      all: [schemaHooks.resolveExternal(${base}ExternalResolver), schemaHooks.resolveResult(${base}Resolver)],
${authAround}    },
    before: {
      all: [schemaHooks.validateQuery(${base}QueryValidator), schemaHooks.resolveQuery(${base}QueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(${base}DataValidator), schemaHooks.resolveData(${base}DataResolver)],
      patch: [schemaHooks.validateData(${base}PatchValidator), schemaHooks.resolveData(${base}PatchResolver)],
      remove: [],
    },
    after: {
      all: [],
    },
    error: {
      all: [],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`
}



function renderServiceNoSchema(ids: ReturnType<typeof createServiceIds>, auth: boolean, docs: boolean, authAware?: boolean) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''

  const docsBlock = docs
    ? `
    docs: {
      description: '${Base} service',
      idType: 'string',
      definitions: {},
    },
`
    : ''

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import type { Application } from 'nuxt-feathers-zod/server'
${authImports}import { getOptions, ${serviceClass} } from './${serviceName}.class'
import { ${base}Hooks } from './${serviceName}.hooks'
import { ${base}Methods, ${base}Path } from './${serviceName}.shared'

export * from './${serviceName}.class'
export * from './${serviceName}.shared'

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(getOptions(app)), {
    methods: ${base}Methods,
    events: [],${docsBlock}
  })

  app.service(${base}Path).hooks(${base}Hooks)
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`
}

function renderHooksNoSchema(ids: ReturnType<typeof createServiceIds>, auth: boolean, authAware?: boolean) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const Service = `${Base}Service`
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''
  const authAwareUsers = isAuthUsersService(ids, auth, authAware)
  const passwordImports = authAwareUsers ? "import { passwordHash } from '@feathersjs/authentication-local'\n" : ''
  const helperBlock = authAwareUsers
    ? `
const stripPassword = (value: unknown) => {
  if (Array.isArray(value))
    return value.map(stripPassword)
  if (!value || typeof value !== 'object')
    return value
  const clone = { ...(value as Record<string, unknown>) }
  delete clone.password
  return clone
}
`
    : ''

  const authAround = auth
    ? `
    find: [authenticate('jwt')],
    get: [authenticate('jwt')],
    create: [],
    patch: [authenticate('jwt')],
    remove: [authenticate('jwt')],
`
    : `
    find: [],
    get: [],
    create: [],
    patch: [],
    remove: [],
`

  const aroundAll = authAwareUsers
    ? `[async (context, next) => {
      await next()
      context.result = stripPassword(context.result)
    }]`
    : '[]'

  const createHooks = authAwareUsers
    ? `[passwordHash({ strategy: 'local' })]`
    : '[]'
  const patchHooks = authAwareUsers
    ? `[passwordHash({ strategy: 'local' })]`
    : '[]'

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/hooks.html

import type { HooksObject } from '@feathersjs/feathers'
${authImports}${passwordImports}import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Service} } from './${ids.serviceNameKebab}.class'
${helperBlock}
// No schema: keep hooks file so the service stays "initiatives-like" and easy to extend.
export const ${base}Hooks: HooksObject<Application, ${Service}> = {
  around: {
    all: ${aroundAll},${authAround}  },
  before: {
    all: [],
    find: [],
    get: [],
    create: ${createHooks},
    patch: ${patchHooks},
    remove: [],
  },
  after: {
    all: [],
  },
  error: {
    all: [],
  },
}
`
}

function renderEmptyHooks(_ids: ReturnType<typeof createServiceIds>) {
  return `// ! Generated by nuxt-feathers-zod - do not change manually\n\nexport default {}\n`
}




function renderCustomSchema(
  ids: ReturnType<typeof createServiceIds>,
  stdMethods: string[],
  customMethods: string[],
) {
  const Base = ids.basePascal
  const base = ids.baseCamel

  const customSchemas = customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m)
    if (m === 'run') {
      return `
export const ${base}${M}DataSchema = z.object({
  action: z.string().min(1),
  payload: z.unknown().optional(),
})
export type ${Base}${M}Data = z.infer<typeof ${base}${M}DataSchema>

export const ${base}${M}ResultSchema = z.object({
  acknowledged: z.boolean(),
  action: z.string(),
  received: z.unknown().optional(),
})
export type ${Base}${M}Result = z.infer<typeof ${base}${M}ResultSchema>
`
    }
    return `
export const ${base}${M}DataSchema = z.unknown()
export type ${Base}${M}Data = z.infer<typeof ${base}${M}DataSchema>

export const ${base}${M}ResultSchema = z.unknown()
export type ${Base}${M}Result = z.infer<typeof ${base}${M}ResultSchema>
`
  }).join('\n') : ''

  return `// ! Generated by nuxt-feathers-zod - adapter-less service template
import { z } from 'zod'

${customSchemas}
`
}

function renderCustomClass(
  ids: ReturnType<typeof createServiceIds>,
  stdMethods: string[],
  customMethods: string[],
  schemaKind: SchemaKind,
) {
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`
  const useSchema = schemaKind === 'zod'

  const uniqueStdMethods = uniq(stdMethods)
  const stdImpl = uniqueStdMethods.length
    ? uniqueStdMethods
        .map((m) => {
          if (m === 'find') {
            return `
  async find(_params?: Params) {
    return [{ ok: true, source: '${ids.serviceNameKebab}.${m}' }]
  }`
          }
          if (m === 'get') {
            return `
  async get(id: Id, _params?: Params) {
    return { id, ok: true, source: '${ids.serviceNameKebab}.${m}' }
  }`
          }
          if (m === 'create') {
            return `
  async create(data: any, _params?: Params) {
    return { ok: true, data, source: '${ids.serviceNameKebab}.${m}' }
  }`
          }
          if (m === 'patch') {
            return `
  async patch(id: NullableId, data: any, _params?: Params) {
    return { ok: true, id, data, source: '${ids.serviceNameKebab}.${m}' }
  }`
          }
          if (m === 'remove') {
            return `
  async remove(id: NullableId, _params?: Params) {
    return { ok: true, id, source: '${ids.serviceNameKebab}.${m}' }
  }`
          }
          if (m === 'update') {
            return `
  async update(id: NullableId, data: any, _params?: Params) {
    return { ok: true, id, data, source: '${ids.serviceNameKebab}.${m}' }
  }`
          }
          return `
  async ${m}(..._args: any[]) {
    throw new Error('${ids.serviceNameKebab}.${m} not implemented')
  }`
        })
        .join('\n')
    : ''

  const uniqueCustomMethods = uniq(customMethods)
  const customImpl = uniqueCustomMethods.length
    ? uniqueCustomMethods
        .map((m) => {
          const M = pascalCase(m)
          const DataT = useSchema ? `${Base}${M}Data` : 'any'
          const ResT = useSchema ? `${Base}${M}Result` : 'any'

          if (m === 'run') {
            return `
  async ${m}(data: ${DataT}, _params?: Params): Promise<${ResT}> {
    return {
      acknowledged: true,
      action: data.action,
      received: data.payload,
    }
  }`
          }

          return `
  async ${m}(data: ${DataT}, _params?: Params): Promise<${ResT}> {
    return data as any
  }`
        })
        .join('\n')
    : ''

  const schemaImports = useSchema ? uniq(customMethods).map((m) => {
    const M = pascalCase(m)
    return `type ${Base}${M}Data, type ${Base}${M}Result`
  }) : []

  const schemaImportLine = schemaImports.length
    ? `import { ${schemaImports.join(', ')} } from './${ids.serviceNameKebab}.schema'`
    : ''

  return `// ! Generated by nuxt-feathers-zod - adapter-less service template
import type { Id, NullableId, Params } from '@feathersjs/feathers'
import type { Application } from 'nuxt-feathers-zod/server'
${schemaImportLine}

export class ${serviceClass} {
  constructor(public app: Application) {}

${stdImpl}

${customImpl}
}
`
}

function renderCustomShared(
  ids: ReturnType<typeof createServiceIds>,
  servicePath: string,
  stdMethods: string[],
  customMethods: string[],
  schemaKind: SchemaKind,
) {
  const Base = ids.basePascal
  const base = ids.baseCamel
  const serviceName = ids.serviceNameKebab

  const stdList = uniq(stdMethods)
  const customList = uniq(customMethods)
  const useSchema = schemaKind === 'zod'

  const allClientMethods = uniq([...stdList, ...customList])

  const schemaImports = useSchema ? customList.map((m) => {
    const M = pascalCase(m)
    return `type ${Base}${M}Data, type ${Base}${M}Result`
  }) : []

  const schemaImportLine = schemaImports.length
    ? `import { ${schemaImports.join(', ')} } from './${serviceName}.schema'`
    : ''

  const patches = customList.length ? customList.map((m) => {
    const M = pascalCase(m)
    const DataT = useSchema ? `${Base}${M}Data` : 'any'
    const ResT = useSchema ? `${Base}${M}Result` : 'any'
    return `
function attach_${m}(client: ClientApplication, remote: any) {
  if (typeof remote?.${m} === 'function')
    return

  // 1) REST transport
  if (typeof remote?.request === 'function') {
    remote.${m} = (data: ${DataT}, params?: Params) =>
      remote.request({ method: '${m}', body: data }, params)
    return
  }

  // 2) Socket transport (best-effort)
  if (typeof remote?.send === 'function') {
    remote.${m} = (data: ${DataT}, params?: Params) =>
      remote.send('${m}', data, params)
    return
  }

  // 3) Universal HTTP fallback
  remote.${m} = async (data: ${DataT}, params?: Params): Promise<${ResT}> => {
    const cfg: any = useRuntimeConfig()
    const pub = cfg.public?.feathers ?? {}

    const baseURL = pub.restUrl ?? pub.baseURL ?? pub.url ?? ''
    const prefix
      = pub.rest?.path
      ?? pub.restPath
      ?? pub.prefix
      ?? '/feathers'

    const url = joinURL(baseURL, prefix, '${servicePath}', '${m}')

    const headers: Record<string, string> = {}
    const auth = (params as any)?.headers?.authorization || (params as any)?.headers?.Authorization
    if (auth)
      headers.authorization = auth

    return await $fetch<${ResT}>(url, { method: 'POST', body: data, headers })
  }
}
`
  }).join('\n') : ''

  const attachCalls = customList.map(m => `    attach_${m}(client, remote)`).join('\n')

  const ssrMethodsList = JSON.stringify(stdList.length ? stdList : ['find'])

  return `// ! Generated by nuxt-feathers-zod - adapter-less service template
import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { RestService } from '@feathersjs/rest-client'
import { joinURL } from 'ufo'
${schemaImportLine}

export const ${base}Path = '${servicePath}'
export const ${base}Methods = ${JSON.stringify(allClientMethods)} as const

export type ${Base}ClientService = RestService & {
${customList.map((m) => {
    const M = pascalCase(m)
    const DataT = useSchema ? `${Base}${M}Data` : 'any'
    const ResT = useSchema ? `${Base}${M}Result` : 'any'
    return `  ${m}(data: ${DataT}, params?: Params): Promise<${ResT}>`
  }).join('\n')}
}

${patches}

export function ${base}Client(client: ClientApplication) {
  const connection: any = client.get('connection')
  const remote: any = connection.service(${base}Path)

  // SSR-safe: register only standard methods on server
  if (import.meta.server) {
    client.use(${base}Path, remote, { methods: ${ssrMethodsList} })
    return
  }

${attachCalls}

  client.use(${base}Path, remote, { methods: ${JSON.stringify(allClientMethods)} })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [${base}Path]: ${Base}ClientService
  }
}
`
}

function renderCustomService(
  ids: ReturnType<typeof createServiceIds>,
  servicePath: string,
  stdMethods: string[],
  customMethods: string[],
  auth: boolean,
  docs: boolean,
  schemaKind: SchemaKind,
) {
  const Base = ids.basePascal
  const base = ids.baseCamel
  const serviceName = ids.serviceNameKebab
  const useSchema = schemaKind === 'zod'
  const serviceClass = `${Base}Service`

  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''

  const allMethods = uniq([...stdMethods, ...customMethods])
  const methodsConst = `${base}Methods`

  const hookBefore = auth
    ? `      all: [authenticate('jwt')],\n`
    : ''

  const schemaHookImports = useSchema && customMethods.length
    ? "import { schemaHooks } from '@feathersjs/schema'\n"
    : ''

  const schemaImports = useSchema && customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m)
    return `${base}${M}DataSchema, ${base}${M}ResultSchema`
  }).join(', ') : ''

  const customHookBlocks = useSchema && customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m)
    return `      ${m}: [
        schemaHooks.validateData(${base}${M}DataSchema),
        schemaHooks.resolveData(async (ctx) => ctx),
      ],`
  }).join('\n') : ''

  // custom result validation is applied as around hooks (required pattern)
  const customAroundBlocks = useSchema && customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m)
    return `      ${m}: [
        async (context) => {
          ${base}${M}ResultSchema.parse(context.result)
          return context
        },
      ],`
  }).join('\n') : ''

  return `// ! Generated by nuxt-feathers-zod - adapter-less service template
import type { Application } from 'nuxt-feathers-zod/server'
${authImports}${schemaHookImports}import { ${serviceClass} } from './${serviceName}.class'
${useSchema && customMethods.length ? `import { ${schemaImports} } from './${serviceName}.schema'\n` : ''}

export const ${base}Path = '${servicePath}'
export const ${methodsConst} = ${JSON.stringify(allMethods)} as const

export function ${base}(app: Application) {
  app.use(${base}Path, new ${serviceClass}(app), {
    methods: ${methodsConst} as unknown as string[],
    events: [],
  })

  app.service(${base}Path).hooks({
    around: {
      all: [],
      ${customMethods.length ? customAroundBlocks : ''}
    },
    before: {
${hookBefore}${customMethods.length ? customHookBlocks : ''}
    },
    after: {
      all: [],
    },
  })
}

declare module 'nuxt-feathers-zod/server' {
  interface ServiceTypes {
    [${base}Path]: ${serviceClass}
  }
}
`
}

function renderNitroMiddleware(name: string) {
  const nice = name.replace(/-/g, ' ')
  return `// Nitro middleware: ${nice}
// Runs on every request (or conditionally based on route rules).

export default defineEventHandler(async (event) => {
  // Example: attach a request id
  // event.context.requestId = crypto.randomUUID()
})
`
}

function renderClientFeathersModule(name: string) {
  const nice = name.replace(/-/g, ' ')
  return `// Feathers client module: ${nice}
// Loaded as a Nuxt client plugin. Use this to enrich $api or register client-side diagnostics.

export default defineNuxtPlugin(() => {
  const api = useNuxtApp().$api as any
  if (!api)
    return

  api.set?.('${name}:clientModuleLoaded', true)
})
`
}

function renderFeathersHook(name: string) {
  const fn = camelCase(name)
  return `// Reusable Feathers hook: ${name}
// Designed for Feathers v5 Dove. Compose it freely with standard hooks or feathers-utils helpers.

import type { HookContext } from 'nuxt-feathers-zod/server'

export async function ${fn}(context: HookContext) {
  return context
}
`
}

function renderFeathersPolicy(name: string) {
  const fn = camelCase(name)
  return `// Reusable Feathers policy: ${name}
// Return true to allow, false to deny, or throw an error.

import { Forbidden } from '@feathersjs/errors'
import type { HookContext } from 'nuxt-feathers-zod/server'

export async function ${fn}(context: HookContext) {
  const allowed = true
  if (!allowed)
    throw new Forbidden('${name} policy denied the request')
  return context
}
`
}

function renderFeathersPlugin(name: string) {
  const nice = name.replace(/-/g, ' ')
  return `// Feathers server plugin: ${nice}
// Loaded by Nuxt Nitro server (see playground/server/feathers/*.ts for examples)

import type { HookContext, NextFunction } from 'nuxt-feathers-zod/server'
import { defineFeathersServerPlugin } from 'nuxt-feathers-zod/server'

export default defineFeathersServerPlugin((app) => {
  app.hooks({
    setup: [
      async (context: HookContext, next: NextFunction) => {
        // Place initialization logic here
        await next()
      },
    ],
  })
})
`
}

function renderServerModule(name: string) {
  const nice = name.replace(/-/g, ' ')
  return `// Feathers server module: ${nice}
// Runs after services/plugins and before routers are mounted.

import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

export default defineFeathersServerModule(async (app, ctx) => {
  app.set('${name}ModuleLoaded', true)
})
`
}

const EXPRESS_SERVER_MODULE_PRESET_NAMES = [
  'helmet',
  'security-headers',
  'request-logger',
  'healthcheck',
  'rate-limit',
  'express-baseline',
] as const

type ExpressServerModulePresetName = typeof EXPRESS_SERVER_MODULE_PRESET_NAMES[number]

function isExpressServerModulePresetName(value: string): value is ExpressServerModulePresetName {
  return (EXPRESS_SERVER_MODULE_PRESET_NAMES as readonly string[]).includes(value)
}

function renderServerModulePreset(preset: string, name: string) {
  if (!isExpressServerModulePresetName(preset)) {
    throw new Error(`Unknown server-module preset: ${preset}`)
  }

  switch (preset) {
    case 'helmet':
      return renderServerModuleHelmet(name)
    case 'security-headers':
      return renderServerModuleSecurityHeaders(name)
    case 'request-logger':
      return renderServerModuleRequestLogger(name)
    case 'healthcheck':
      return renderServerModuleHealthcheck(name)
    case 'rate-limit':
      return renderServerModuleRateLimit(name)
    case 'express-baseline':
      return renderServerModule(name)
  }
}

function getExpressServerModulePresetFiles() {
  return [
    { name: 'helmet', content: renderServerModuleHelmet('helmet') },
    { name: 'security-headers', content: renderServerModuleSecurityHeaders('security-headers') },
    { name: 'request-logger', content: renderServerModuleRequestLogger('request-logger') },
    { name: 'healthcheck', content: renderServerModuleHealthcheck('healthcheck') },
    { name: 'rate-limit', content: renderServerModuleRateLimit('rate-limit') },
  ]
}

function renderServerModuleHelmet(name: string) {
  return `// Express preset server module: helmet
// Uses helmet when installed in the host app. Falls back gracefully when unavailable.

import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

export default defineFeathersServerModule(async (app) => {
  const expressApp = app as any
  if (typeof expressApp?.use !== 'function')
    return

  try {
    const mod = await import('helmet')
    const helmet = (mod as any).default ?? mod
    expressApp.use(helmet())
    app.set('${name}ModuleLoaded', true)
  }
  catch (error) {
    console.warn('[nuxt-feathers-zod] helmet preset skipped: install helmet in the host app to enable it.')
  }
})
`
}

function renderServerModuleSecurityHeaders(name: string) {
  return `// Express preset server module: security-headers

import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

export default defineFeathersServerModule(async (app) => {
  const expressApp = app as any
  if (typeof expressApp?.use !== 'function')
    return

  expressApp.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    next()
  })

  app.set('${name}ModuleLoaded', true)
})
`
}

function renderServerModuleRequestLogger(name: string) {
  return `// Express preset server module: request-logger

import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

export default defineFeathersServerModule(async (app) => {
  const expressApp = app as any
  if (typeof expressApp?.use !== 'function')
    return

  expressApp.use((req: any, res: any, next: any) => {
    const startedAt = Date.now()
    res.on('finish', () => {
      const duration = Date.now() - startedAt
      console.info('[nfz][request]', req.method, req.originalUrl || req.url, res.statusCode, duration + 'ms')
    })
    next()
  })

  app.set('${name}ModuleLoaded', true)
})
`
}

function renderServerModuleHealthcheck(name: string) {
  return `// Express preset server module: healthcheck

import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

export default defineFeathersServerModule(async (app, ctx) => {
  const expressApp = app as any
  if (typeof expressApp?.get !== 'function')
    return

  const basePath = ctx?.config?.transports?.rest?.path || '/feathers'
  const healthPath = basePath.endsWith('/') ? basePath + 'health' : basePath + '/health'

  expressApp.get(healthPath, (_req: any, res: any) => {
    res.json({ ok: true, service: 'nuxt-feathers-zod', timestamp: new Date().toISOString() })
  })

  app.set('${name}ModuleLoaded', true)
})
`
}

function renderServerModuleRateLimit(name: string) {
  return `// Express preset server module: rate-limit
// Lightweight in-memory limiter with no extra dependency.

import { defineFeathersServerModule } from 'nuxt-feathers-zod/server'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 120
const hits = new Map<string, { count: number, resetAt: number }>()

export default defineFeathersServerModule(async (app) => {
  const expressApp = app as any
  if (typeof expressApp?.use !== 'function')
    return

  expressApp.use((req: any, res: any, next: any) => {
    const now = Date.now()
    const key = String(req.ip || req.headers['x-forwarded-for'] || 'global')
    const current = hits.get(key)

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + WINDOW_MS })
      return next()
    }

    current.count += 1
    if (current.count > MAX_REQUESTS) {
      res.status(429).json({ error: 'Too Many Requests', retryAfterMs: current.resetAt - now })
      return
    }

    next()
  })

  app.set('${name}ModuleLoaded', true)
})
`
}


function renderSecureConfig(secure: NonNullable<NonNullable<NuxtConfigPatch['embedded']>['secure']>) {
  const parts: string[] = []
  if (typeof secure.cors === 'boolean') parts.push(`cors: ${secure.cors}`)
  if (typeof secure.compression === 'boolean') parts.push(`compression: ${secure.compression}`)
  if (typeof secure.helmet === 'boolean') parts.push(`helmet: ${secure.helmet}`)
  if (secure.bodyParser) {
    const bp: string[] = []
    if (typeof secure.bodyParser.json === 'boolean') bp.push(`json: ${secure.bodyParser.json}`)
    if (typeof secure.bodyParser.urlencoded === 'boolean') bp.push(`urlencoded: ${secure.bodyParser.urlencoded}`)
    if (bp.length) parts.push(`bodyParser: { ${bp.join(', ')} }`)
  }
  if (secure.serveStatic === false) {
    parts.push(`serveStatic: false`)
  } else if (secure.serveStatic) {
    const ss: string[] = []
    if (secure.serveStatic.path) ss.push(`path: '${secure.serveStatic.path}'`)
    if (secure.serveStatic.dir) ss.push(`dir: '${secure.serveStatic.dir}'`)
    parts.push(`serveStatic: { ${ss.join(', ')} }`)
  }
  return `{ ${parts.join(', ')} }`
}

function ensureNestedServerSecure(
  objLiteral: string,
  secure: NonNullable<NonNullable<NuxtConfigPatch['embedded']>['secure']>,
): string {
  const block = locateObjectLiteral(objLiteral, /\bserver\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  const srvObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)

  let patched = srvObj
  const secureLiteral = renderSecureConfig(secure)
  if (/\bsecure\s*:/.test(patched)) {
    const secureBlock = locateObjectLiteral(patched, /\bsecure\s*:\s*\{/)
    if (secureBlock) {
      patched = patched.slice(0, secureBlock.start) + `secure: ${secureLiteral}` + patched.slice(secureBlock.end)
    }
  } else {
    patched = insertProp(patched, `secure: ${secureLiteral}`)
  }

  return before + patched + after
}

function ensureNestedClientRemote(objLiteral: string, patch: NuxtConfigPatch): string {
  const block = locateObjectLiteral(objLiteral, /\bclient\s*:\s*\{/)
  if (!block) return objLiteral
  const before = objLiteral.slice(0, block.start)
  const clientObj = objLiteral.slice(block.start, block.end)
  const after = objLiteral.slice(block.end)

  let patchedClient = clientObj

  const wantsRemote = patch.clientMode === 'remote' || !!patch.remote || !!patch.remoteService
  const wantsEmbedded = patch.clientMode === 'embedded'

  if (wantsEmbedded) {
    // set mode to embedded
    if (/\bmode\s*:/.test(patchedClient)) {
      patchedClient = patchedClient.replace(/\bmode\s*:\s*['"][^'"]+['"]/, "mode: 'embedded'")
    } else {
      patchedClient = insertProp(patchedClient, "mode: 'embedded'")
    }
    return before + patchedClient + after
  }

  if (wantsRemote) {
    if (/\bmode\s*:/.test(patchedClient)) {
      patchedClient = patchedClient.replace(/\bmode\s*:\s*['"][^'"]+['"]/, "mode: 'remote'")
    } else {
      patchedClient = insertProp(patchedClient, "mode: 'remote'")
    }

    // Ensure remote object
    if (/\bremote\s*:/.test(patchedClient)) {
      patchedClient = patchNestedRemoteObject(patchedClient, patch)
    } else {
      const parts: string[] = []
      if (patch.remote?.url) parts.push(`url: '${patch.remote.url}'`)
      if (patch.remote?.transport) parts.push(`transport: '${patch.remote.transport}'`)
      if (patch.remote?.restPath) parts.push(`restPath: '${patch.remote.restPath}'`)
      if (patch.remote?.websocketPath) parts.push(`websocketPath: '${patch.remote.websocketPath}'`)
      if (patch.remote?.websocket) {
        parts.push(
          `websocket: ${renderWebsocketConfig(patch.remote.websocket as any, patch.remote.websocketPath)}`,
        )
      }
      if (patch.remote?.auth) {
        const a = patch.remote.auth
        const ap: string[] = []
        if (a.enabled !== undefined) ap.push(`enabled: ${a.enabled}`)
        if (a.payloadMode) ap.push(`payloadMode: '${a.payloadMode}'`)
        if (a.strategy) ap.push(`strategy: '${a.strategy}'`)
        if (a.tokenField) ap.push(`tokenField: '${a.tokenField}'`)
        if (a.servicePath) ap.push(`servicePath: '${a.servicePath}'`)
        if (a.reauth !== undefined) ap.push(`reauth: ${a.reauth}`)
        parts.push(`auth: { ${ap.join(', ')} }`)
      }
      if (patch.remoteService) {
        const methodsPart = patch.remoteService.methods?.length
          ? `, methods: ${JSON.stringify(patch.remoteService.methods)}`
          : ''
        const entry = `{ path: '${patch.remoteService.path}'${methodsPart} }`
        parts.push(`services: [${entry}]`)
      }
      patchedClient = insertProp(patchedClient, `remote: { ${parts.join(', ')} }`)
    }
  }

  return before + patchedClient + after
}

function patchNestedRemoteObject(clientObjLiteral: string, patch: NuxtConfigPatch): string {
  const block = locateObjectLiteral(clientObjLiteral, /\bremote\s*:\s*\{/)
  if (!block) return clientObjLiteral
  const before = clientObjLiteral.slice(0, block.start)
  const remoteObj = clientObjLiteral.slice(block.start, block.end)
  const after = clientObjLiteral.slice(block.end)

  let patched = remoteObj

  // url (required for remote mode)
  if (patch.remote?.url) {
    if (/\burl\s*:/.test(patched)) {
      patched = patched.replace(/\burl\s*:\s*['"][^'"]*['"]/, `url: '${patch.remote.url}'`)
    } else {
      patched = insertProp(patched, `url: '${patch.remote.url}'`)
    }
  }

  // transport
  if (patch.remote?.transport) {
    if (/\btransport\s*:/.test(patched)) {
      patched = patched.replace(/\btransport\s*:\s*['"][^'"]*['"]/, `transport: '${patch.remote.transport}'`)
    } else {
      patched = insertProp(patched, `transport: '${patch.remote.transport}'`)
    }
  }

  // restPath/websocketPath
  if (patch.remote?.restPath) {
    if (/\brestPath\s*:/.test(patched)) {
      patched = patched.replace(/\brestPath\s*:\s*['"][^'"]*['"]/, `restPath: '${patch.remote.restPath}'`)
    } else {
      patched = insertProp(patched, `restPath: '${patch.remote.restPath}'`)
    }
  }
  if (patch.remote?.websocketPath) {
    if (/\bwebsocketPath\s*:/.test(patched)) {
      patched = patched.replace(/\bwebsocketPath\s*:\s*['"][^'"]*['"]/, `websocketPath: '${patch.remote.websocketPath}'`)
    } else {
      patched = insertProp(patched, `websocketPath: '${patch.remote.websocketPath}'`)
    }
  }
  if (patch.remote?.websocket) {
    const websocketConfig = renderWebsocketConfig(patch.remote.websocket as any, patch.remote.websocketPath)
    if (/\bwebsocket\s*:/.test(patched)) {
      const websocketBlock = locateObjectLiteral(patched, /\bwebsocket\s*:\s*\{/)
      if (websocketBlock)
        patched =
          patched.slice(0, websocketBlock.start)
          + `websocket: ${websocketConfig}`
          + patched.slice(websocketBlock.end)
    } else {
      patched = insertProp(patched, `websocket: ${websocketConfig}`)
    }
  }

  // auth
  if (patch.remote?.auth) {
    const a = patch.remote.auth
    if (/\bauth\s*:/.test(patched)) {
      // best-effort: replace enabled/payloadMode/strategy/tokenField/servicePath/reauth if present, otherwise insert
      patched = patchNestedAuthObject(patched, a)
    } else {
      const ap: string[] = []
      if (a.enabled !== undefined) ap.push(`enabled: ${a.enabled}`)
      if (a.payloadMode) ap.push(`payloadMode: '${a.payloadMode}'`)
      if (a.strategy) ap.push(`strategy: '${a.strategy}'`)
      if (a.tokenField) ap.push(`tokenField: '${a.tokenField}'`)
      if (a.servicePath) ap.push(`servicePath: '${a.servicePath}'`)
      if (a.reauth !== undefined) ap.push(`reauth: ${a.reauth}`)
      patched = insertProp(patched, `auth: { ${ap.join(', ')} }`)
    }
  }

  // remote services registration
  if (patch.remoteService) {
    const methodsPart = patch.remoteService.methods?.length
      ? `, methods: ${JSON.stringify(patch.remoteService.methods)}`
      : ''
    const entry = `{ path: '${patch.remoteService.path}'${methodsPart} }`
    if (/\bservices\s*:/.test(patched)) {
      // naive: if the path already exists, do nothing; otherwise append.
      if (!new RegExp(`path\s*:\s*['"]${escapeRegExp(patch.remoteService.path)}['"]`).test(patched)) {
        patched = patched.replace(/(\bservices\s*:\s*\[)([\s\S]*?)(\])/, (all, a, inner, b) => {
          const trimmed = String(inner).trim()
          const nextInner = trimmed.length ? `${trimmed.replace(/\s+$/,'')}, ${entry}` : `${entry}`
          return `${a}${nextInner}${b}`
        })
      }
    } else {
      patched = insertProp(patched, `services: [${entry}]`)
    }
  }

  return before + patched + after
}

function patchNestedAuthObject(remoteObjLiteral: string, auth: NonNullable<NuxtConfigPatch['remote']>['auth']): string {
  const block = locateObjectLiteral(remoteObjLiteral, /\bauth\s*:\s*\{/)
  if (!block) return remoteObjLiteral
  const before = remoteObjLiteral.slice(0, block.start)
  const authObj = remoteObjLiteral.slice(block.start, block.end)
  const after = remoteObjLiteral.slice(block.end)

  let patched = authObj
  if (auth?.enabled !== undefined) {
    if (/\benabled\s*:/.test(patched)) patched = patched.replace(/\benabled\s*:\s*(true|false)/, `enabled: ${auth.enabled}`)
    else patched = insertProp(patched, `enabled: ${auth.enabled}`)
  }
  if (auth?.payloadMode) {
    if (/\bpayloadMode\s*:/.test(patched)) {
      patched = patched.replace(/\bpayloadMode\s*:\s*['"][^'"]*['"]/, `payloadMode: '${auth.payloadMode}'`)
    }
    else patched = insertProp(patched, `payloadMode: '${auth.payloadMode}'`)
  }
  if (auth?.strategy) {
    if (/\bstrategy\s*:/.test(patched)) {
      patched = patched.replace(/\bstrategy\s*:\s*['"][^'"]*['"]/, `strategy: '${auth.strategy}'`)
    }
    else patched = insertProp(patched, `strategy: '${auth.strategy}'`)
  }
  if (auth?.tokenField) {
    if (/\btokenField\s*:/.test(patched)) {
      patched = patched.replace(/\btokenField\s*:\s*['"][^'"]*['"]/, `tokenField: '${auth.tokenField}'`)
    }
    else patched = insertProp(patched, `tokenField: '${auth.tokenField}'`)
  }
  if (auth?.servicePath) {
    if (/\bservicePath\s*:/.test(patched)) {
      patched = patched.replace(/\bservicePath\s*:\s*['"][^'"]*['"]/, `servicePath: '${auth.servicePath}'`)
    }
    else patched = insertProp(patched, `servicePath: '${auth.servicePath}'`)
  }
  if (auth?.reauth !== undefined) {
    if (/\breauth\s*:/.test(patched)) patched = patched.replace(/\breauth\s*:\s*(true|false)/, `reauth: ${auth.reauth}`)
    else patched = insertProp(patched, `reauth: ${auth.reauth}`)
  }

  return before + patched + after
}
