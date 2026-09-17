import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

import consola from 'consola'

import type { ServiceIdStrategy } from '../core/types'
import { isServiceIdStrategySupported } from '../identifiers'
import { getDefaultAuthStrategies, getAuthStaticDefaults } from '../../runtime/options/authentication'
import { getAuthLocalDefaults } from '../../runtime/options/authentication/local'
import { getNfzDatabaseProviderDescriptor, listNfzDatabaseProviderDescriptors } from '../../runtime/options/database'
import { getMongoManagementRoutes, normalizeMongoManagementBasePath } from '../../runtime/options/database/mongodb'

function detectTrackedMaintenanceArtifacts(projectRoot: string): string[] {
  if (!existsSync(resolve(projectRoot, '.git')))
    return []

  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const forbiddenExactPaths = new Set([
      'AGENTS.md',
      'PATCHLOG.md',
      'PRODUCTION_AUDIT.md',
      'REPO_DEV.md',
      'RELEASE_CHECKLIST.md',
      'TODO.md',
      '.coderabbit.yaml',
      '.vscode/mcp.json',
    ])
    const forbiddenPrefixes = ['ANALYSE_', 'VALIDATIONS_', 'INVENTAIRE_PATCH_', 'RELEASE_NOTES_', 'PATCH_', 'PROMPT_', 'CONTEXT_']

    return output
      .split('\0')
      .map(file => file.replace(/\\/g, '/'))
      .filter(Boolean)
      .filter((file) => {
        const segments = file.split('/')
        const fileName = segments.at(-1) || ''
        return forbiddenExactPaths.has(file)
          || segments.includes('patch-memory')
          || segments.includes('docs-private')
          || segments.includes('skills')
          || forbiddenPrefixes.some(prefix => fileName.startsWith(prefix))
      })
      .sort()
  }
  catch {
    return []
  }
}

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

function parseLoadOrder(cfg: string): string[] {
  const raw = cfg.match(/loadOrder\s*:\s*\[([^\]]*)\]/)?.[1]
  return raw ? parseStringArray(raw) : ['modules:pre', 'plugins', 'services', 'modules:post']
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

function extractRootObjectBody(source: string): string {
  const markerIndex = source.search(/defineNuxtConfig\s*\(/)
  const objectStart = source.indexOf('{', markerIndex >= 0 ? markerIndex : 0)
  if (objectStart < 0)
    return source

  let state: ScanState = 'normal'
  let escape = false
  let depth = 0

  for (let index = objectStart; index < source.length; index++) {
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
      if ((state === 'single' && char === '\'') || (state === 'double' && char === '"') || (state === 'template' && char === '`'))
        state = 'normal'
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
      depth++
      continue
    }
    if (char === '}') {
      depth--
      if (depth === 0)
        return source.slice(objectStart + 1, index)
    }
  }

  return source.slice(objectStart + 1)
}

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

function parseTopLevelObjectEntries(rawObject: string | null): Array<[string, string]> {
  if (!rawObject?.trim().startsWith('{'))
    return []

  const source = rawObject.trim().slice(1, -1)
  const entries: Array<[string, string]> = []
  let index = 0

  const skipSpaceAndComments = () => {
    while (index < source.length) {
      if (/\s|,/.test(source[index] || '')) {
        index++
        continue
      }
      if (source[index] === '/' && source[index + 1] === '/') {
        index += 2
        while (index < source.length && source[index] !== '\n')
          index++
        continue
      }
      if (source[index] === '/' && source[index + 1] === '*') {
        index += 2
        while (index < source.length && !(source[index] === '*' && source[index + 1] === '/'))
          index++
        index += 2
        continue
      }
      break
    }
  }

  while (index < source.length) {
    skipSpaceAndComments()
    if (index >= source.length)
      break

    let key = ''
    const quote = source[index]
    if (quote === '\'' || quote === '"' || quote === '`') {
      index++
      while (index < source.length && source[index] !== quote) {
        key += source[index]
        index++
      }
      index++
    }
    else {
      const match = source.slice(index).match(/^[A-Za-z_$][\w$-]*/)
      if (!match) {
        index++
        continue
      }
      key = match[0]
      index += key.length
    }

    while (index < source.length && /\s/.test(source[index] || ''))
      index++
    if (source[index] !== ':')
      continue
    index++
    while (index < source.length && /\s/.test(source[index] || ''))
      index++

    const valueStart = index
    let state: ScanState = 'normal'
    let escape = false
    let curly = 0
    let square = 0
    let paren = 0

    for (; index < source.length; index++) {
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
        if ((state === 'single' && char === '\'') || (state === 'double' && char === '"') || (state === 'template' && char === '`'))
          state = 'normal'
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
      if (char === '{')
        curly++
      else if (char === '}')
        curly--
      else if (char === '[')
        square++
      else if (char === ']')
        square--
      else if (char === '(')
        paren++
      else if (char === ')')
        paren--
      else if (char === ',' && curly === 0 && square === 0 && paren === 0)
        break
    }

    const value = source.slice(valueStart, index).trim()
    if (key && value)
      entries.push([key, value])
    index++
  }

  return entries
}

interface ParsedDatabaseRegistryConfig {
  default?: string
  connections: Array<{
    name: string
    type: string
    enabled: boolean
    provider: string
    databaseFamily: string
    certification: string
    driverPackage?: string
  }>
}

function parseDatabaseRegistryConfig(cfg: string): ParsedDatabaseRegistryConfig {
  const rootBody = extractRootObjectBody(cfg)
  const feathersBlock = extractTopLevelValue(rootBody, 'feathers')
  const feathersBody = feathersBlock?.startsWith('{') ? feathersBlock.slice(1, -1) : rootBody
  const databaseBlock = extractTopLevelValue(feathersBody, 'database')
  if (!databaseBlock?.startsWith('{'))
    return { connections: [] }

  const databaseBody = databaseBlock.slice(1, -1)
  const defaultName = parseQuotedString(extractTopLevelValue(databaseBody, 'default')) || undefined
  const connectionsBlock = extractTopLevelValue(databaseBody, 'connections')
  const connections = parseTopLevelObjectEntries(connectionsBlock).map(([name, raw]) => {
    const body = raw.startsWith('{') ? raw.slice(1, -1) : ''
    const type = parseQuotedString(extractTopLevelValue(body, 'type'))
    const enabled = extractTopLevelValue(body, 'enabled')?.trim() !== 'false'
    const configuredDriverPackage = parseQuotedString(extractTopLevelValue(body, 'driverPackage'))
    try {
      const descriptor = getNfzDatabaseProviderDescriptor(type)
      return {
        name,
        type,
        enabled,
        provider: descriptor.provider,
        databaseFamily: descriptor.databaseFamily,
        certification: descriptor.certification,
        ...(configuredDriverPackage || descriptor.driverPackage
          ? { driverPackage: configuredDriverPackage || descriptor.driverPackage }
          : {}),
      }
    }
    catch {
      return { name, type: type || '(missing)', enabled, provider: 'unsupported', databaseFamily: 'unknown', certification: 'unsupported' }
    }
  })

  return {
    ...(defaultName ? { default: defaultName } : {}),
    connections,
  }
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
  const rootBody = extractRootObjectBody(cfg)
  const feathersBlock = extractTopLevelValue(rootBody, 'feathers')
  const feathersBody = feathersBlock?.startsWith('{') ? feathersBlock.slice(1, -1) : rootBody
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

interface EmbeddedServiceSource {
  name: string
  source: string
}

interface ServiceDatabaseBinding {
  service: string
  adapter: 'mongodb' | 'knex'
  connectionName?: string
  databaseType?: string
  databaseProvider?: string
  databaseFamily?: string
  idStrategy?: ServiceIdStrategy
}

async function detectServiceDatabaseBindings(absServicesDirs: string[]): Promise<ServiceDatabaseBinding[]> {
  const bindings: ServiceDatabaseBinding[] = []
  for (const dir of absServicesDirs) {
    const manifestsDir = join(dir, '.nfz', 'services')
    if (!existsSync(manifestsDir))
      continue

    for (const entry of (await readdir(manifestsDir).catch(() => [])).filter(name => name.endsWith('.json')).sort()) {
      const filePath = join(manifestsDir, entry)
      try {
        const manifest = JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
        const adapter = manifest.adapter === 'mongodb' || manifest.adapter === 'knex'
          ? manifest.adapter
          : undefined
        if (!adapter)
          continue
        bindings.push({
          service: typeof manifest.name === 'string' ? manifest.name : entry.replace(/\.json$/, ''),
          adapter,
          ...(typeof manifest.connectionName === 'string' ? { connectionName: manifest.connectionName } : {}),
          ...(typeof manifest.databaseType === 'string' ? { databaseType: manifest.databaseType } : {}),
          ...(typeof manifest.databaseProvider === 'string' ? { databaseProvider: manifest.databaseProvider } : {}),
          ...(typeof manifest.databaseFamily === 'string' ? { databaseFamily: manifest.databaseFamily } : {}),
          ...(['objectid', 'uuid', 'integer', 'bigint', 'string'].includes(String(manifest.idStrategy)) ? { idStrategy: manifest.idStrategy as ServiceIdStrategy } : {}),
        })
      }
      catch {
        // Malformed service manifests are diagnosed by schema/service commands; doctor keeps scanning other services.
      }
    }
  }
  return bindings
}

function diagnoseServiceDatabaseBindings(
  bindings: ServiceDatabaseBinding[],
  registry: ParsedDatabaseRegistryConfig,
  errors: string[],
) {
  const byName = new Map(registry.connections.map(connection => [connection.name, connection]))
  for (const binding of bindings) {
    const targetName = binding.connectionName || registry.default
    if (!targetName)
      continue
    const connection = byName.get(targetName)
    if (!connection) {
      consola.warn(`Service ${binding.service} references database connection '${targetName}', which doctor could not resolve statically.`)
      continue
    }

    const expectedProvider = binding.adapter === 'mongodb' ? 'mongodb' : 'knex'
    if (binding.idStrategy && !isServiceIdStrategySupported(binding.adapter, binding.idStrategy)) {
      const message = `Service ${binding.service} declares idStrategy '${binding.idStrategy}' which is not supported by adapter '${binding.adapter}'.`
      errors.push(message)
      consola.error(message)
    }
    if (connection.provider !== expectedProvider) {
      const message = `Service ${binding.service} uses adapter '${binding.adapter}' but connection '${targetName}' resolves to provider '${connection.provider}'.`
      errors.push(message)
      consola.error(message)
    }
    if (binding.databaseProvider && binding.databaseProvider !== connection.provider) {
      const message = `Service ${binding.service} declares databaseProvider '${binding.databaseProvider}' but connection '${targetName}' resolves to '${connection.provider}'.`
      errors.push(message)
      consola.error(message)
    }
    if (binding.databaseType && binding.databaseType !== connection.type) {
      const message = `Service ${binding.service} declares databaseType '${binding.databaseType}' but connection '${targetName}' is configured as '${connection.type}'.`
      errors.push(message)
      consola.error(message)
    }
  }
}

async function detectEmbeddedServiceSources(absServicesDirs: string[]): Promise<EmbeddedServiceSource[]> {
  const found = new Map<string, EmbeddedServiceSource>()
  for (const dir of absServicesDirs) {
    if (!existsSync(dir))
      continue

    const entries = await readdir(dir).catch(() => [])
    for (const entry of entries.sort()) {
      const serviceDir = join(dir, entry)
      const fileStat = await stat(serviceDir).catch(() => null)
      if (!fileStat?.isDirectory())
        continue

      const files = (await readdir(serviceDir).catch(() => []))
        .filter(file => /\.(?:ts|mts|js|mjs)$/.test(file))
        .sort()
      const preferred = files.find(file => file === `${entry}.ts`)
        || files.find(file => file === `${entry}.mts`)
        || files[0]
      if (!preferred)
        continue

      const source = join(serviceDir, preferred)
      const key = `${entry}:${source.replace(/\\/g, '/').toLowerCase()}`
      found.set(key, { name: entry, source })
    }
  }

  return [...found.values()].sort((left, right) => left.source.localeCompare(right.source))
}

async function detectEmbeddedServices(absServicesDirs: string[]) {
  const sources = await detectEmbeddedServiceSources(absServicesDirs)
  return [...new Set(sources.map(item => item.name))].sort()
}

async function detectFeathersPluginSources(projectRoot: string): Promise<string[]> {
  const roots = [
    resolve(projectRoot, 'server/feathers/plugins'),
    resolve(projectRoot, 'feathers/server/plugins'),
    resolve(projectRoot, 'server/feathers'),
  ]
  const found = new Set<string>()
  for (const root of roots) {
    if (!existsSync(root))
      continue
    for (const entry of (await readdir(root).catch(() => [])).sort()) {
      const filePath = join(root, entry)
      const fileStat = await stat(filePath).catch(() => null)
      if (fileStat?.isFile() && /\.(?:ts|mts|js|mjs)$/.test(entry))
        found.add(filePath)
    }
  }
  return [...found].sort()
}

async function detectManualServiceImports(pluginSources: string[], services: EmbeddedServiceSource[]) {
  const matches: Array<{ plugin: string, service: EmbeddedServiceSource }> = []
  for (const plugin of pluginSources) {
    const source = await readFile(plugin, 'utf8').catch(() => '')
    const normalized = source.replace(/\\/g, '/')
    for (const service of services) {
      const markers = [
        `/services/${service.name}/`,
        `services/${service.name}/`,
        service.source.replace(/\\/g, '/').replace(/\.(?:ts|mts|js|mjs)$/, ''),
      ]
      if (markers.some(marker => normalized.includes(marker)))
        matches.push({ plugin, service })
    }
  }
  return matches
}

interface ZodRuntimeDiagnostic {
  declaredRange: string | null
  application: { version: string, path: string } | null
  nfz: { version: string, path: string } | null
  copies: Array<{ version: string, path: string }>
  compatible: boolean | null
  errors: string[]
}

function majorOf(version: string): number | null {
  const match = version.match(/^(\d+)/)
  return match ? Number(match[1]) : null
}

async function readPackageVersion(packageJsonPath: string): Promise<string> {
  const payload = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { version?: unknown }
  return typeof payload.version === 'string' ? payload.version : 'unknown'
}

async function resolveZodPackage(from: string): Promise<{ version: string, path: string } | null> {
  try {
    const request = createRequire(resolve(from, 'package.json'))
    const packagePath = request.resolve('zod/package.json')
    return { version: await readPackageVersion(packagePath), path: await realpath(packagePath).catch(() => packagePath) }
  }
  catch {
    return null
  }
}

async function findInstalledZodCopies(projectRoot: string): Promise<Array<{ version: string, path: string }>> {
  const rootNodeModules = resolve(projectRoot, 'node_modules')
  if (!existsSync(rootNodeModules))
    return []

  const queue = [rootNodeModules]
  const visited = new Set<string>()
  const packageFiles = new Set<string>()
  while (queue.length && visited.size < 5000) {
    const current = queue.shift()
    if (!current || visited.has(current))
      continue
    visited.add(current)

    const zodPackage = join(current, 'zod', 'package.json')
    if (existsSync(zodPackage))
      packageFiles.add(await realpath(zodPackage).catch(() => zodPackage))

    const entries = await readdir(current, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === '.bin')
        continue
      const packageDir = join(current, entry.name)
      if (entry.name.startsWith('@')) {
        const scoped = await readdir(packageDir, { withFileTypes: true }).catch(() => [])
        for (const child of scoped) {
          if (child.isDirectory()) {
            const nested = join(packageDir, child.name, 'node_modules')
            if (existsSync(nested))
              queue.push(nested)
          }
        }
      }
      else {
        const nested = join(packageDir, 'node_modules')
        if (existsSync(nested))
          queue.push(nested)
      }
    }
  }

  return Promise.all([...packageFiles].sort().map(async path => ({ version: await readPackageVersion(path), path })))
}

async function diagnoseZodRuntime(projectRoot: string): Promise<ZodRuntimeDiagnostic> {
  const projectPackagePath = resolve(projectRoot, 'package.json')
  const projectPackage = existsSync(projectPackagePath)
    ? JSON.parse(await readFile(projectPackagePath, 'utf8')) as Record<string, any>
    : {}
  const declaredRange = projectPackage.dependencies?.zod
    || projectPackage.peerDependencies?.zod
    || projectPackage.devDependencies?.zod
    || null
  const application = await resolveZodPackage(projectRoot)
  const nfzPackageRoot = resolve(dirname(new URL(import.meta.url).pathname), '../../..')
  const nfz = await resolveZodPackage(nfzPackageRoot)
  const copies = await findInstalledZodCopies(projectRoot)
  const errors: string[] = []
  const declaredMajor = typeof declaredRange === 'string' ? majorOf(declaredRange.replace(/^[^0-9]*/, '')) : null
  if (declaredMajor !== null && declaredMajor !== 3)
    errors.push(`Application declares incompatible Zod range ${declaredRange}; NFZ 6.7.x requires Zod 3.`)
  if (application && majorOf(application.version) !== 3)
    errors.push(`Application resolves incompatible Zod ${application.version} at ${application.path}.`)
  if (nfz && majorOf(nfz.version) !== 3)
    errors.push(`NFZ validators resolve incompatible Zod ${nfz.version} at ${nfz.path}.`)
  if (application && nfz && application.path !== nfz.path)
    errors.push('Application schemas and NFZ validators resolve different active Zod runtimes.')

  const compatible = application && nfz
    ? errors.length === 0
    : declaredMajor === null ? null : declaredMajor === 3 && errors.length === 0
  return { declaredRange, application, nfz, copies, compatible, errors }
}

export async function detectFeathersPlugins(projectRoot: string) {
  const roots = [resolve(projectRoot, 'server/feathers/plugins'), resolve(projectRoot, 'feathers/server/plugins'), resolve(projectRoot, 'server/feathers')]
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

export interface NfzDoctorResult {
  ok: boolean
  errors: string[]
}

export async function runDoctor(projectRoot: string): Promise<NfzDoctorResult> {
  const errors: string[] = []
  const nuxtConfigPath = findNuxtConfigPath(projectRoot)
  consola.info('NFZ doctor')
  consola.info(`- projectRoot: ${projectRoot}`)
  consola.info(`- nuxt.config: ${nuxtConfigPath ? relativeToCwd(nuxtConfigPath) : '(not found)'}`)

  const trackedMaintenanceArtifacts = detectTrackedMaintenanceArtifacts(projectRoot)
  consola.info(`- tracked local maintenance artifacts: ${trackedMaintenanceArtifacts.length}`)
  if (trackedMaintenanceArtifacts.length) {
    consola.warn(`Tracked local maintenance artifacts detected: ${trackedMaintenanceArtifacts.slice(0, 10).join(', ')}`)
    consola.warn('Run bun run repo:clean-maintenance-index from the repository root, then review git status --short.')
  }

  if (!nuxtConfigPath) {
    consola.warn('No nuxt.config found. Nothing to diagnose.')
    return { ok: true, errors }
  }

  const cfg = await readFile(nuxtConfigPath, 'utf8')
  const hasModule = /\bmodules\s*:\s*\[[^\]]*['"]nuxt-feathers-zod['"]/.test(cfg) || /['"]nuxt-feathers-zod['"]/.test(cfg)
  consola.info(`- modules includes 'nuxt-feathers-zod': ${hasModule ? 'yes' : 'no'}`)

  const mode = parseMode(cfg)
  const restPath = parseRestPath(cfg)
  let serviceDatabaseBindings: ServiceDatabaseBinding[] = []
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
    const serviceSources = await detectEmbeddedServiceSources(absServicesDirs)
    const services = [...new Set(serviceSources.map(item => item.name))].sort()
    consola.info(`- services discovered: ${services.length}`)
    for (const service of serviceSources)
      consola.info(`  - service ${service.name}: ${relative(projectRoot, service.source).replace(/\\/g, '/')}`)

    serviceDatabaseBindings = await detectServiceDatabaseBindings(absServicesDirs)
    consola.info(`- service database bindings: ${serviceDatabaseBindings.length}`)
    for (const binding of serviceDatabaseBindings) {
      consola.info(
        `  - ${binding.service}: adapter=${binding.adapter}${binding.connectionName ? ` connection=${binding.connectionName}` : ''}${binding.databaseType ? ` databaseType=${binding.databaseType}` : ''}${binding.databaseProvider ? ` provider=${binding.databaseProvider}` : ''}${binding.databaseFamily ? ` databaseFamily=${binding.databaseFamily}` : ''}${binding.idStrategy ? ` idStrategy=${binding.idStrategy}` : ''}`,
      )
    }

    const loadOrder = parseLoadOrder(cfg)
    consola.info(`- server.loadOrder: ${loadOrder.join(' -> ')}`)
    if (serviceSources.length && !loadOrder.includes('services')) {
      const message = 'servicesDirs contains discovered services but server.loadOrder omits the services phase.'
      errors.push(message)
      consola.error(message)
    }

    const pluginSources = await detectFeathersPluginSources(projectRoot)
    const manualImports = await detectManualServiceImports(pluginSources, serviceSources)
    for (const match of manualImports) {
      const message = `Service ${match.service.name} is discovered through servicesDirs and manually imported by ${relative(projectRoot, match.plugin).replace(/\\/g, '/')}.`
      errors.push(message)
      consola.error(message)
    }

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

  const zod = await diagnoseZodRuntime(projectRoot)
  consola.info(`- zod declared range: ${zod.declaredRange || '(not declared)'}`)
  consola.info(`- zod installed copies: ${zod.copies.length}`)
  consola.info(`- zod application runtime: ${zod.application ? `${zod.application.version} (${zod.application.path})` : '(not resolved)'}`)
  consola.info(`- zod NFZ validator runtime: ${zod.nfz ? `${zod.nfz.version} (${zod.nfz.path})` : '(not resolved)'}`)
  consola.info(`- zod compatibility: ${zod.compatible === null ? 'not-verifiable' : zod.compatible ? 'compatible' : 'incompatible'}`)
  for (const message of zod.errors) {
    errors.push(message)
    consola.error(message)
  }

  const databaseSupportMatrix = listNfzDatabaseProviderDescriptors()
  const certifiedDatabaseCount = databaseSupportMatrix.filter(engine => engine.certification === 'certified').length
  consola.info(`- database.supportedEngines: ${databaseSupportMatrix.map(engine => engine.type).join(', ')}`)
  consola.info(`- database.certifiedEngines: ${certifiedDatabaseCount}/${databaseSupportMatrix.length}`)

  const databaseRegistry = parseDatabaseRegistryConfig(cfg)
  if (databaseRegistry.connections.length || databaseRegistry.default) {
    consola.info(`- database.default: ${databaseRegistry.default || '(implicit)'}`)
    consola.info(`- database.connections: ${databaseRegistry.connections.length}`)
    for (const connection of databaseRegistry.connections) {
      consola.info(
        `  - ${connection.name}: type=${connection.type} provider=${connection.provider} databaseFamily=${connection.databaseFamily} certification=${connection.certification}${connection.driverPackage ? ` driver=${connection.driverPackage}` : ''} enabled=${connection.enabled}`,
      )
    }
  }
  diagnoseServiceDatabaseBindings(serviceDatabaseBindings, databaseRegistry, errors)

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
  consola.info(`- plugins discovered: ${plugins.length}`)
  for (const plugin of plugins)
    consola.info(`  - plugin: ${plugin}`)

  const serverModules = await detectServerModules(projectRoot)
  const configuredPreModules = [...cfg.matchAll(/phase\s*:\s*['"]pre['"]/g)].length
  const configuredPostModules = [...cfg.matchAll(/phase\s*:\s*['"]post['"]/g)].length
  consola.info(`- modules pre configured: ${configuredPreModules}`)
  consola.info(`- modules post configured: ${configuredPostModules}`)
  consola.info(`- module files discovered: ${serverModules.length}`)
  for (const module of serverModules)
    consola.info(`  - module: ${module}`)

  const mongoDetected = await detectMongoSignals(projectRoot, absServicesDirs)
  consola.info(`- mongodb signals detected: ${mongoDetected ? 'yes' : 'no'}`)
  return { ok: errors.length === 0, errors }
}
