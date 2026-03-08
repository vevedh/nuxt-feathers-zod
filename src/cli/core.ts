import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { kebabCase, pascalCase } from 'change-case'
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
export type MiddlewareTarget = 'nitro' | 'feathers' | 'server-module' | 'module'
export type IdField = 'id' | '_id'
export type CollectionName = string

export interface RunCliOptions {
  cwd: string
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
  bunx nuxt-feathers-zod remote auth keycloak --ssoUrl https://sso.example --realm myrealm --clientId myapp
  bunx nuxt-feathers-zod doctor

Flags overview:

  init templates:
    --dir <dir>                (default: feathers/templates)
    --force
    --dry

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
    --transport socketio|rest   (default: socketio)
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

  add middleware <name>:
    --target nitro|feathers|server-module|module (default: nitro)
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
      const transportRestPath = patch.remote?.restPath ?? '/feathers'
      const transportWebsocket = websocket || `{ path: '${patch.remote?.websocketPath ?? '/socket.io'}' }`

      return `
    transports: {
      rest: { path: '${transportRestPath}' },
      websocket: ${transportWebsocket}
    },
    client: {
      mode: 'remote',
      ${remoteObj}
    },`
    }

    return `
    client: { mode: 'embedded' },`
  })()

  return `
    feathers: {${servicesPart}${authPart}${templatesPart}${serverPart}${embeddedPart}${keycloakPart}${clientPart}
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
      ? [{ path: schemaFile, content: renderZodSchema(ids, opts.adapter, opts.idField) }]
      : schemaKind === 'json'
        ? [{ path: schemaFile, content: renderJsonSchema(ids, opts.adapter, opts.idField) }]
        : []),
    { path: classFile, content: renderClass(ids, opts.adapter, collectionName, schemaKind) },
    ...(schemaKind === 'none'
      ? [{ path: hooksFile, content: renderHooksNoSchema(ids, opts.auth) }]
      : []),
    { path: sharedFile, content: renderShared(ids, servicePath, schemaKind) },
    { path: serviceFile, content: renderService(ids, opts.auth, opts.docs, schemaKind) },
  ]

  await ensureDir(dir, opts.dry)

  for (const f of files) {
    await writeFileSafe(f.path, f.content, { dry: opts.dry, force: opts.force })
  }

  if (opts.docs) {
    await ensureFeathersSwaggerSupport(opts.projectRoot, { dry: opts.dry, force: opts.force })
  }

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
  await writeFileSafe(typesFile, typesContent, { dry: io.dry, force: io.force })

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
    { path: classFile, content: renderCustomClass(ids, stdMethods, customMethods) },
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


export async function generateMiddleware(opts: GenerateMiddlewareOptions) {
  const fileBase = kebabCase(opts.name)

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

function renderZodSchema(ids: ReturnType<typeof createServiceIds>, adapter: Adapter, idField: IdField) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

  const idSchemaField = idField
  const idSchema = adapter === 'mongodb'
    ? `
const objectIdRegex = /^[0-9a-f]{24}$/i
export const objectIdSchema = () => z.string().regex(objectIdRegex, 'Invalid ObjectId')
`
    : ''

  const mainSchema = adapter === 'mongodb'
    ? `export const ${base}Schema = z.object({
  ${idSchemaField}: objectIdSchema(),
  text: z.string(),
})`
    : `export const ${base}Schema = z.object({
  ${idSchemaField}: z.number().int(),
  text: z.string(),
})`

  const pickCreate = adapter === 'mongodb'
    ? `{ text: true }`
    : `{ text: true }`

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { ${serviceClass} } from './${ids.serviceNameKebab}.class'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
${idSchema}

// Main data model schema
${mainSchema}
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
export const ${base}QuerySchema = zodQuerySyntax(${base}Schema)
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
  const mongoClient = app.get('mongodbClient')
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


function renderJsonSchema(ids: ReturnType<typeof createServiceIds>, adapter: Adapter, idField: IdField) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

  const idSchemaField = idField
  const idType = adapter === 'mongodb' ? 'string' : 'number'

  const idSchema = adapter === 'mongodb'
    ? `
const objectIdRegex = '^[0-9a-f]{24}$'
`
    : ''

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
    ${idSchemaField}: { type: '${idType}' },
    text: { type: 'string' },
  },
} as const

export type ${Base} = {
  ${idSchemaField}: ${adapter === 'mongodb' ? 'string' : 'number'}
  text: string
  [key: string]: any
}

export const ${base}Validator = getValidator(${base}Schema as any, dataValidatorAjv)
export const ${base}Resolver = resolve<${Base}, HookContext<${serviceClass}>>({})
export const ${base}ExternalResolver = resolve<${Base}, HookContext<${serviceClass}>>({})

// Schema for creating new entries
export const ${base}DataSchema = {
  ...${base}Schema,
  $id: '${Base}Data',
  required: ['text'],
  properties: {
    text: { type: 'string' },
  },
} as const

export type ${Base}Data = {
  text: string
  [key: string]: any
}

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
export const ${base}QuerySchema = querySyntax(${base}Schema as any)
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
  const mongoClient = app.get('mongodbClient')
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

function renderService(ids: ReturnType<typeof createServiceIds>, auth: boolean, docs: boolean, schemaKind: SchemaKind) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const serviceName = ids.serviceNameKebab
  const serviceClass = `${Base}Service`
  if (schemaKind === 'none') {
    return renderServiceNoSchema(ids, auth, docs)
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



function renderServiceNoSchema(ids: ReturnType<typeof createServiceIds>, auth: boolean, docs: boolean) {
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

function renderHooksNoSchema(ids: ReturnType<typeof createServiceIds>, auth: boolean) {
  const base = ids.baseCamel
  const Base = ids.basePascal
  const Service = `${Base}Service`
  const authImports = auth ? "import { authenticate } from '@feathersjs/authentication'\n" : ''

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

  return `// For more information about this file see https://dove.feathersjs.com/guides/cli/hooks.html

import type { HooksObject } from '@feathersjs/feathers'
${authImports}import type { Application } from 'nuxt-feathers-zod/server'
import type { ${Service} } from './${ids.serviceNameKebab}.class'

// No schema: keep hooks file so the service stays "initiatives-like" and easy to extend.
export const ${base}Hooks: HooksObject<Application, ${Service}> = {
  around: {
    all: [],${authAround}  },
  before: {
    all: [],
    find: [],
    get: [],
    create: [],
    patch: [],
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
) {
  const Base = ids.basePascal
  const serviceClass = `${Base}Service`

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
          const DataT = `${Base}${M}Data`
          const ResT = `${Base}${M}Result`

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

  const schemaImports = uniq(customMethods).map((m) => {
    const M = pascalCase(m)
    return `type ${Base}${M}Data, type ${Base}${M}Result`
  })

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
    const DataT = `${Base}${M}Data`
    const ResT = `${Base}${M}Result`
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
    return `  ${m}(data: ${Base}${M}Data, params?: Params): Promise<${Base}${M}Result>`
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

  const schemaHookImports = customMethods.length
    ? "import { schemaHooks } from '@feathersjs/schema'\n"
    : ''

  const schemaImports = customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m)
    return `${base}${M}DataSchema, ${base}${M}ResultSchema`
  }).join(', ') : ''

  const customHookBlocks = customMethods.length ? customMethods.map((m) => {
    const M = pascalCase(m)
    return `      ${m}: [
        schemaHooks.validateData(${base}${M}DataSchema),
        schemaHooks.resolveData(async (ctx) => ctx),
      ],`
  }).join('\n') : ''

  // custom result validation is applied as around hooks (required pattern)
  const customAroundBlocks = customMethods.length ? customMethods.map((m) => {
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
${customMethods.length ? `import { ${schemaImports} } from './${serviceName}.schema'\n` : ''}

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
