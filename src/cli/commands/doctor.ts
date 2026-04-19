import { existsSync } from 'node:fs'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import consola from 'consola'

import { getDefaultAuthStrategies, getAuthStaticDefaults } from '../../runtime/options/authentication'
import { getAuthLocalDefaults } from '../../runtime/options/authentication/local'
import { getMongoManagementRoutes, normalizeMongoManagementBasePath } from '../../runtime/options/database/mongodb'

function relativeToCwd(filePath: string) {
  return filePath.replace(process.cwd().replace(/\\/g, '/'), '.').replace(/\\/g, '/')
}

function findNuxtConfigPath(projectRoot: string): string | null {
  const candidates = [
    'nuxt.config.ts',
    'nuxt.config.mts',
    'nuxt.config.js',
    'nuxt.config.mjs',
  ].map(file => resolve(projectRoot, file))

  return candidates.find(file => existsSync(file)) ?? null
}

function parseStringArray(raw?: string) {
  if (!raw)
    return [] as string[]

  return raw
    .replace(/[\[\]]/g, '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => value.replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function parseMode(cfg: string) {
  return cfg.match(/client\s*:\s*\{[\s\S]*?mode\s*:\s*['"](embedded|remote)['"]/)?.[1] ?? 'embedded(?)'
}

function parseRestPath(cfg: string) {
  return cfg.match(/rest\s*:\s*\{[\s\S]*?path\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? '/feathers'
}

function parseServicesDirs(cfg: string, projectRoot: string, mode: string) {
  const servicesDirsRaw = (() => {
    const arr = cfg.match(/servicesDirs\s*:\s*\[([^\]]*)\]/)?.[1]
    if (arr)
      return arr

    const single = cfg.match(/servicesDirs\s*:\s*['"]([^'"]+)['"]/)?.[1]
    if (single)
      return JSON.stringify([single])

    const legacy = cfg.match(/servicesDir\s*:\s*['"]([^'"]+)['"]/)?.[1]
    if (legacy)
      return JSON.stringify([legacy])

    return ''
  })()

  const servicesDirs = parseStringArray(servicesDirsRaw)
  if (!servicesDirs.length && mode !== 'remote')
    servicesDirs.push('services')

  const abs: string[] = []
  const seen = new Set<string>()
  for (const dir of servicesDirs) {
    const full = resolve(projectRoot, dir)
    const key = full.replace(/\\/g, '/').toLowerCase()
    if (seen.has(key))
      continue
    seen.add(key)
    abs.push(full)
  }

  return abs
}

function parseRemoteUrl(cfg: string) {
  return cfg.match(/remote\s*:\s*\{[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
}

function parseRemoteTransport(cfg: string) {
  return cfg.match(/remote\s*:\s*\{[\s\S]*?transport\s*:\s*['"](socketio|rest|auto)['"]/)?.[1] ?? ''
}

function parseWebsocketPath(cfg: string) {
  return cfg.match(/websocket\s*:\s*\{[\s\S]*?path\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? '/socket.io'
}

function parseRemoteAuth(cfg: string) {
  const enabled = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?enabled\s*:\s*(true|false)/)?.[1] ?? ''
  const payloadMode = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?payloadMode\s*:\s*['"](jwt|keycloak)['"]/)?.[1] ?? ''
  const strategy = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?strategy\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
  const tokenField = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?tokenField\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
  const servicePath = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?servicePath\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
  const reauth = cfg.match(/remote\s*:\s*\{[\s\S]*?auth\s*:\s*\{[\s\S]*?reauth\s*:\s*(true|false)/)?.[1] ?? ''

  return { enabled, payloadMode, strategy, tokenField, servicePath, reauth }
}

function parseRemoteServices(cfg: string) {
  const servicesMatch = cfg.match(/services\s*:\s*\[/)
  if (servicesMatch?.index == null)
    return []

  const listStart = cfg.indexOf('[', servicesMatch.index)
  if (listStart === -1)
    return []

  let depth = 0
  let listEnd = -1
  for (let index = listStart; index < cfg.length; index++) {
    const char = cfg[index]
    if (char === '[')
      depth++
    else if (char === ']') {
      depth--
      if (depth === 0) {
        listEnd = index
        break
      }
    }
  }

  if (listEnd === -1)
    return []

  const block = cfg.slice(listStart + 1, listEnd)
  const names = [...block.matchAll(/path\s*:\s*['"]([^'"]+)['"]/g)].map(match => match[1])
  return Array.from(new Set(names))
}

function parseKeycloak(cfg: string) {
  const serverUrl = cfg.match(/keycloak\s*:\s*\{[\s\S]*?serverUrl\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
  const realm = cfg.match(/keycloak\s*:\s*\{[\s\S]*?realm\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
  const clientId = cfg.match(/keycloak\s*:\s*\{[\s\S]*?clientId\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
  return { serverUrl, realm, clientId }
}

function parseBooleanValue(raw?: string) {
  if (!raw)
    return undefined
  if (/^true$/i.test(raw))
    return true
  if (/^false$/i.test(raw))
    return false
  return undefined
}

function parseMongoManagement(cfg: string) {
  const url = cfg.match(/mongo\s*:\s*\{[\s\S]*?url\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? ''
  const enabled = parseBooleanValue(cfg.match(/mongo\s*:\s*\{[\s\S]*?management\s*:\s*\{[\s\S]*?enabled\s*:\s*(true|false)/)?.[1]) ?? false
  const auth = parseBooleanValue(cfg.match(/mongo\s*:\s*\{[\s\S]*?management\s*:\s*\{[\s\S]*?auth\s*:\s*(true|false)/)?.[1]) ?? true
  const basePathRaw = cfg.match(/mongo\s*:\s*\{[\s\S]*?management\s*:\s*\{[\s\S]*?basePath\s*:\s*['"]([^'"]+)['"]/)?.[1] ?? '/mongo'
  const exposeDatabasesService = parseBooleanValue(cfg.match(/mongo\s*:\s*\{[\s\S]*?management\s*:\s*\{[\s\S]*?exposeDatabasesService\s*:\s*(true|false)/)?.[1]) ?? true
  const exposeCollectionsService = parseBooleanValue(cfg.match(/mongo\s*:\s*\{[\s\S]*?management\s*:\s*\{[\s\S]*?exposeCollectionsService\s*:\s*(true|false)/)?.[1]) ?? true
  const exposeUsersService = parseBooleanValue(cfg.match(/mongo\s*:\s*\{[\s\S]*?management\s*:\s*\{[\s\S]*?exposeUsersService\s*:\s*(true|false)/)?.[1]) ?? false
  const exposeCollectionCrud = parseBooleanValue(cfg.match(/mongo\s*:\s*\{[\s\S]*?management\s*:\s*\{[\s\S]*?exposeCollectionCrud\s*:\s*(true|false)/)?.[1]) ?? true

  return {
    url,
    enabled,
    auth,
    basePath: normalizeMongoManagementBasePath(basePathRaw),
    exposeDatabasesService,
    exposeCollectionsService,
    exposeUsersService,
    exposeCollectionCrud,
  }
}

function redactMongoUrl(url: string) {
  if (!url)
    return ''
  return url.replace(/:\/\/([^:@/]+):([^@/]+)@/, '://$1:***@')
}

type ScanState = 'normal' | 'single' | 'double' | 'template' | 'lineComment' | 'blockComment'

function isIdentifierChar(char: string | undefined) {
  return !!char && /[A-Za-z0-9_$]/.test(char)
}

function extractTopLevelValue(source: string, key: string): string | null {
  let state: ScanState = 'normal'
  let depthCurly = 0
  let depthSquare = 0
  let depthParen = 0
  let escape = false

  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    const next = source[index + 1]

    if (state === 'lineComment') {
      if (char === '\n')
        state = 'normal'
      continue
    }

    if (state === 'blockComment') {
      if (char === '*' && next === '/') {
        state = 'normal'
        index++
      }
      continue
    }

    if (state === 'single' || state === 'double' || state === 'template') {
      if (escape) {
        escape = false
        continue
      }
      if (char === '\\') {
        escape = true
        continue
      }
      if ((state === 'single' && char === '\'') || (state === 'double' && char === '"') || (state === 'template' && char === '`')) {
        state = 'normal'
      }
      continue
    }

    if (char === '/' && next === '/') {
      state = 'lineComment'
      index++
      continue
    }
    if (char === '/' && next === '*') {
      state = 'blockComment'
      index++
      continue
    }
    if (char === '\'') {
      state = 'single'
      continue
    }
    if (char === '"') {
      state = 'double'
      continue
    }
    if (char === '`') {
      state = 'template'
      continue
    }

    if (char === '{') {
      depthCurly++
      continue
    }
    if (char === '}') {
      depthCurly = Math.max(0, depthCurly - 1)
      continue
    }
    if (char === '[') {
      depthSquare++
      continue
    }
    if (char === ']') {
      depthSquare = Math.max(0, depthSquare - 1)
      continue
    }
    if (char === '(') {
      depthParen++
      continue
    }
    if (char === ')') {
      depthParen = Math.max(0, depthParen - 1)
      continue
    }

    if (depthCurly !== 0 || depthSquare !== 0 || depthParen !== 0)
      continue

    if (source.startsWith(key, index) && !isIdentifierChar(source[index - 1]) && !isIdentifierChar(source[index + key.length])) {
      let cursor = index + key.length
      while (cursor < source.length && /\s/.test(source[cursor]))
        cursor++
      if (source[cursor] !== ':')
        continue
      cursor++
      while (cursor < source.length && /\s/.test(source[cursor]))
        cursor++
      const valueStart = cursor
      const first = source[valueStart]
      if (!first)
        return null

      if (first === '{' || first === '[' || first === '(') {
        const closing = first === '{' ? '}' : first === '[' ? ']' : ')'
        let nestedState: ScanState = 'normal'
        let nestedEscape = false
        let nestedDepth = 0
        for (let end = valueStart; end < source.length; end++) {
          const c = source[end]
          const n = source[end + 1]
          if (nestedState === 'lineComment') {
            if (c === '\n')
              nestedState = 'normal'
            continue
          }
          if (nestedState === 'blockComment') {
            if (c === '*' && n === '/') {
              nestedState = 'normal'
              end++
            }
            continue
          }
          if (nestedState === 'single' || nestedState === 'double' || nestedState === 'template') {
            if (nestedEscape) {
              nestedEscape = false
              continue
            }
            if (c === '\\') {
              nestedEscape = true
              continue
            }
            if ((nestedState === 'single' && c === '\'') || (nestedState === 'double' && c === '"') || (nestedState === 'template' && c === '`')) {
              nestedState = 'normal'
            }
            continue
          }
          if (c === '/' && n === '/') {
            nestedState = 'lineComment'
            end++
            continue
          }
          if (c === '/' && n === '*') {
            nestedState = 'blockComment'
            end++
            continue
          }
          if (c === '\'') {
            nestedState = 'single'
            continue
          }
          if (c === '"') {
            nestedState = 'double'
            continue
          }
          if (c === '`') {
            nestedState = 'template'
            continue
          }
          if (c === first)
            nestedDepth++
          else if (c === closing) {
            nestedDepth--
            if (nestedDepth === 0)
              return source.slice(valueStart, end + 1).trim()
          }
        }
        return source.slice(valueStart).trim()
      }

      if (first === '\'' || first === '"' || first === '`') {
        let nestedEscape = false
        for (let end = valueStart + 1; end < source.length; end++) {
          const c = source[end]
          if (nestedEscape) {
            nestedEscape = false
            continue
          }
          if (c === '\\') {
            nestedEscape = true
            continue
          }
          if (c === first)
            return source.slice(valueStart, end + 1).trim()
        }
        return source.slice(valueStart).trim()
      }

      let end = valueStart
      while (end < source.length && source[end] !== ',' && source[end] !== '\n' && source[end] !== '\r')
        end++
      return source.slice(valueStart, end).trim()
    }
  }

  return null
}

function parseQuotedString(raw: string | null, fallback = '') {
  if (!raw)
    return fallback
  const trimmed = raw.trim()
  return trimmed.replace(/^['"`]|['"`]$/g, '') || fallback
}

interface ParsedEmbeddedAuthConfig {
  enabled: boolean
  source: 'default' | 'boolean' | 'object'
  service: string
  entity: string
  authStrategies: string[]
  localEnabled: boolean
  localConfigured: boolean
  local: {
    usernameField: string
    passwordField: string
    entityUsernameField: string
    entityPasswordField: string
    errorMessage?: string
  }
}

function parseEmbeddedAuthConfig(cfg: string): ParsedEmbeddedAuthConfig {
  const authStaticDefaults = getAuthStaticDefaults()
  const authLocalDefaults = getAuthLocalDefaults()
  const defaultAuthStrategies = getDefaultAuthStrategies()
  const feathersBlock = extractTopLevelValue(cfg, 'feathers')
  const feathersBody = feathersBlock?.startsWith('{') ? feathersBlock.slice(1, -1) : cfg
  const rawAuthValue = extractTopLevelValue(feathersBody, 'auth')

  if (rawAuthValue?.trim() === 'false') {
    return {
      enabled: false,
      source: 'boolean',
      service: authStaticDefaults.service,
      entity: authStaticDefaults.entity,
      authStrategies: [],
      localEnabled: false,
      localConfigured: false,
      local: {
        usernameField: authLocalDefaults.usernameField || 'userId',
        passwordField: authLocalDefaults.passwordField || 'password',
        entityUsernameField: authLocalDefaults.entityUsernameField || authLocalDefaults.usernameField || 'userId',
        entityPasswordField: authLocalDefaults.entityPasswordField || authLocalDefaults.passwordField || 'password',
        errorMessage: authLocalDefaults.errorMessage,
      },
    }
  }

  const authValue = rawAuthValue?.trim()
  if (!authValue || authValue === 'true') {
    return {
      enabled: true,
      source: authValue === 'true' ? 'boolean' : 'default',
      service: authStaticDefaults.service,
      entity: authStaticDefaults.entity,
      authStrategies: [...defaultAuthStrategies],
      localEnabled: defaultAuthStrategies.includes('local'),
      localConfigured: false,
      local: {
        usernameField: authLocalDefaults.usernameField || 'userId',
        passwordField: authLocalDefaults.passwordField || 'password',
        entityUsernameField: authLocalDefaults.entityUsernameField || authLocalDefaults.usernameField || 'userId',
        entityPasswordField: authLocalDefaults.entityPasswordField || authLocalDefaults.passwordField || 'password',
        errorMessage: authLocalDefaults.errorMessage,
      },
    }
  }

  const authBody = authValue.startsWith('{') ? authValue.slice(1, -1) : ''
  const service = parseQuotedString(extractTopLevelValue(authBody, 'service'), authStaticDefaults.service)
  const entity = parseQuotedString(extractTopLevelValue(authBody, 'entity'), authStaticDefaults.entity)
  const authStrategies = parseStringArray(extractTopLevelValue(authBody, 'authStrategies') || '')
  const effectiveStrategies = authStrategies.length ? authStrategies : [...defaultAuthStrategies]
  const rawLocal = extractTopLevelValue(authBody, 'local')
  const localBody = rawLocal?.startsWith('{') ? rawLocal.slice(1, -1) : ''
  const usernameField = parseQuotedString(extractTopLevelValue(localBody, 'usernameField'), authLocalDefaults.usernameField || 'userId')
  const passwordField = parseQuotedString(extractTopLevelValue(localBody, 'passwordField'), authLocalDefaults.passwordField || 'password')
  const entityUsernameField = parseQuotedString(extractTopLevelValue(localBody, 'entityUsernameField'), authLocalDefaults.entityUsernameField || usernameField || 'userId')
  const entityPasswordField = parseQuotedString(extractTopLevelValue(localBody, 'entityPasswordField'), authLocalDefaults.entityPasswordField || passwordField || 'password')
  const errorMessage = parseQuotedString(extractTopLevelValue(localBody, 'errorMessage'), authLocalDefaults.errorMessage || '') || undefined

  return {
    enabled: true,
    source: 'object',
    service,
    entity,
    authStrategies: effectiveStrategies,
    localEnabled: effectiveStrategies.includes('local'),
    localConfigured: Boolean(rawLocal),
    local: {
      usernameField,
      passwordField,
      entityUsernameField,
      entityPasswordField,
      errorMessage,
    },
  }
}

async function detectEmbeddedServices(absServicesDirs: string[]) {
  const serviceNames: string[] = []
  for (const dir of absServicesDirs) {
    if (!existsSync(dir))
      continue

    const entries = await readdir(dir).catch(() => [])
    for (const entry of entries) {
      const filePath = join(dir, entry)
      const fileStat = await stat(filePath).catch(() => null)
      if (!fileStat?.isDirectory())
        continue

        const files = await readdir(filePath).catch(() => [])
      if (files.some(file => file.endsWith('.ts')))
        serviceNames.push(entry)
    }
  }

  return Array.from(new Set(serviceNames)).sort()
}

export async function detectFeathersPlugins(projectRoot: string) {
  const roots = [resolve(projectRoot, 'server/feathers'), resolve(projectRoot, 'feathers/server/plugins')]
  const found = new Set<string>()
  for (const root of roots) {
    if (!existsSync(root))
      continue

    const entries = await readdir(root).catch(() => [])
    for (const entry of entries) {
      const filePath = join(root, entry)
      const fileStat = await stat(filePath).catch(() => null)
      if (fileStat?.isFile() && entry.endsWith('.ts'))
        found.add(entry)
    }
  }

  return Array.from(found).sort()
}

export async function detectServerModules(projectRoot: string) {
  const roots = [resolve(projectRoot, 'server/feathers/modules')]
  const found = new Set<string>()
  for (const root of roots) {
    if (!existsSync(root))
      continue

    const entries = await readdir(root).catch(() => [])
    for (const entry of entries) {
      const filePath = join(root, entry)
      const fileStat = await stat(filePath).catch(() => null)
      if (fileStat?.isFile() && entry.endsWith('.ts'))
        found.add(entry)
    }
  }

  return Array.from(found).sort()
}

async function detectMongoSignals(projectRoot: string, absServicesDirs: string[]) {
  const scanRoots = [...absServicesDirs, resolve(projectRoot, 'feathers/server')].filter(filePath => existsSync(filePath))

  const candidates: string[] = []
  for (const root of scanRoots) {
    const queue: string[] = [root]
    while (queue.length) {
      const current = queue.pop()
      if (!current)
        continue

      const fileStat = await stat(current).catch(() => null)
      if (!fileStat)
        continue

      if (fileStat.isDirectory()) {
        const children = await readdir(current).catch(() => [])
        for (const child of children)
          queue.push(join(current, child))
      }
      else if (fileStat.isFile() && current.endsWith('.ts')) {
        candidates.push(current)
      }
    }
  }

  for (const filePath of candidates.slice(0, 800)) {
    const text = await readFile(filePath, 'utf8').catch(() => '')
    if (text.includes('mongodbClient') || text.includes("app.get('mongodbClient')") || text.includes('@feathersjs/mongodb'))
      return true
  }

  return false
}

export async function runDoctor(projectRoot: string) {
  const nuxtConfigPath = findNuxtConfigPath(projectRoot)
  consola.info('NFZ doctor')
  consola.info(`- projectRoot: ${projectRoot}`)
  consola.info(`- nuxt.config: ${nuxtConfigPath ? relativeToCwd(nuxtConfigPath) : '(not found)'}`)

  if (!nuxtConfigPath) {
    consola.warn('No nuxt.config found. Nothing to diagnose.')
    return
  }

  const cfg = await readFile(nuxtConfigPath, 'utf8')
  const hasModule = /\bmodules\s*:\s*\[[^\]]*['"]nuxt-feathers-zod['"]/.test(cfg) || /['"]nuxt-feathers-zod['"]/.test(cfg)
  consola.info(`- modules includes 'nuxt-feathers-zod': ${hasModule ? 'yes' : 'no'}`)

  const mode = parseMode(cfg)
  const restPath = parseRestPath(cfg)
  consola.info(`- feathers.client.mode: ${mode}`)
  consola.info(`- transports.rest.path: ${restPath}`)

  const templatesDirs = cfg.match(/templates\s*:\s*\{[\s\S]*?dirs\s*:\s*\[([^\]]*)\]/)?.[1]?.trim()
  if (templatesDirs)
    consola.info(`- feathers.templates.dirs: [${templatesDirs}]`)

  const moduleDirs = cfg.match(/moduleDirs\s*:\s*\[([^\]]*)\]/)?.[1]?.trim()
  if (moduleDirs)
    consola.info(`- feathers.server.moduleDirs: [${moduleDirs}]`)

  const absServicesDirs = parseServicesDirs(cfg, projectRoot, mode)
  if (absServicesDirs.length)
    consola.info(`- servicesDirs: ${absServicesDirs.map(relativeToCwd).join(', ')}`)

  if (mode === 'remote') {
    const remoteUrl = parseRemoteUrl(cfg)
    const remoteTransport = parseRemoteTransport(cfg) || 'socketio(?)'
    const websocketPath = parseWebsocketPath(cfg)
    const remoteAuth = parseRemoteAuth(cfg)
    const remoteServices = parseRemoteServices(cfg)
    const keycloak = parseKeycloak(cfg)

    consola.info(`- client.remote.url: ${remoteUrl || '(missing)'}`)
    consola.info(`- client.remote.transport: ${remoteTransport}`)
    consola.info(`- transports.websocket.path: ${websocketPath}`)
    consola.info(`- client.remote.auth.enabled: ${remoteAuth.enabled || 'false(?)'}`)

    if (remoteAuth.enabled === 'true') {
      consola.info(`- client.remote.auth.payloadMode: ${remoteAuth.payloadMode || 'jwt(?)'}`)
      consola.info(`- client.remote.auth.strategy: ${remoteAuth.strategy || 'jwt(?)'}`)
      consola.info(`- client.remote.auth.tokenField: ${remoteAuth.tokenField || 'accessToken(?)'}`)
      consola.info(`- client.remote.auth.servicePath: ${remoteAuth.servicePath || 'authentication(?)'}`)
      consola.info(`- client.remote.auth.reauth: ${remoteAuth.reauth || 'true(?)'}`)
    }

    if (remoteServices.length)
      consola.info(`- client.remote.services: ${remoteServices.join(', ')}`)
    else
      consola.info('- client.remote.services: (none declared)')

    if (keycloak.serverUrl || keycloak.realm || keycloak.clientId) {
      consola.info(`- keycloak.serverUrl: ${keycloak.serverUrl || '(missing)'}`)
      consola.info(`- keycloak.realm: ${keycloak.realm || '(missing)'}`)
      consola.info(`- keycloak.clientId: ${keycloak.clientId || '(missing)'}`)
    }
  }
  else {
    const services = await detectEmbeddedServices(absServicesDirs)
    consola.info(`- embedded services detected: ${services.length ? services.join(', ') : '(none)'}`)

    const auth = parseEmbeddedAuthConfig(cfg)
    consola.info(`- auth.enabled: ${auth.enabled}`)
    if (auth.enabled) {
      consola.info(`- auth.source: ${auth.source}`)
      consola.info(`- auth.service: ${auth.service}`)
      consola.info(`- auth.entity: ${auth.entity}`)
      consola.info(`- auth.authStrategies: ${auth.authStrategies.length ? auth.authStrategies.join(', ') : '(none)'}`)
      consola.info(`- auth.local.enabled: ${auth.localEnabled}`)
      if (auth.localEnabled) {
        consola.info(`- auth.local.usernameField: ${auth.local.usernameField}`)
        consola.info(`- auth.local.passwordField: ${auth.local.passwordField}`)
        consola.info(`- auth.local.entityUsernameField: ${auth.local.entityUsernameField}`)
        consola.info(`- auth.local.entityPasswordField: ${auth.local.entityPasswordField}`)
        if (auth.local.errorMessage)
          consola.info(`- auth.local.errorMessage: ${auth.local.errorMessage}`)
        consola.info(`- auth.local.payload.example: { strategy: 'local', ${auth.local.usernameField}: '<value>', ${auth.local.passwordField}: '<value>' }`)

        if (auth.local.usernameField !== auth.local.entityUsernameField || auth.local.passwordField !== auth.local.entityPasswordField) {
          consola.warn(
            'Local auth request/entity field mapping differs. Consumer login UIs should use buildLocalAuthPayload() or runtimeConfig.public._feathers.auth.local instead of hardcoding local payload fields.',
          )
        }
      }
      if (!auth.localEnabled && auth.localConfigured)
        consola.warn('auth.local is configured but authStrategies does not include local, so the local strategy will stay inactive.')
      if (!services.length && auth.localEnabled) {
        consola.warn('Embedded local auth is enabled but no embedded services were detected. Ensure feathers.servicesDirs is correct and generate the auth service (for example: bunx nuxt-feathers-zod add service users --auth).')
      }
    }
  }

  const mongo = parseMongoManagement(cfg)
  if (mongo.url || mongo.enabled) {
    consola.info(`- database.mongo.url: ${mongo.url ? redactMongoUrl(mongo.url) : '(missing)'}`)
    consola.info(`- database.mongo.management.enabled: ${mongo.enabled}`)
    consola.info(`- database.mongo.management.auth: ${mongo.auth}`)
    consola.info(`- database.mongo.management.basePath: ${mongo.basePath}`)
    const routes = getMongoManagementRoutes(mongo)
    consola.info(`- database.mongo.management.routes: ${routes.length ? routes.map(route => route.path).join(', ') : '(none)'}`)
    if (mongo.enabled && !mongo.url)
      consola.warn('Mongo management is enabled but database.mongo.url is missing.')
  }

  const plugins = await detectFeathersPlugins(projectRoot)
  if (plugins.length)
    consola.info(`- feathers server plugins: ${plugins.join(', ')}`)

  const serverModules = await detectServerModules(projectRoot)
  if (serverModules.length)
    consola.info(`- server modules: ${serverModules.join(', ')}`)

  const mongoDetected = await detectMongoSignals(projectRoot, absServicesDirs)
  consola.info(`- mongodb signals detected: ${mongoDetected ? 'yes' : 'no'}`)
}
