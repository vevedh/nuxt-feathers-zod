import type { Import } from 'unimport'

import type { ModuleOptions } from '.'

import type { PluginOptions, ResolvedPluginOptions, ResolvedPlugins } from './plugins'
import { existsSync } from 'node:fs'
import { createResolver } from '@nuxt/kit'
import { resolvePluginsOptions } from './plugins'

export interface ServerModuleObject {
  src: string
  options?: any
  enabled?: boolean
  phase?: 'pre' | 'post'
}

export type ServerModuleEntry = string | Import | ServerModuleObject

export interface ResolvedServerModule extends Import {
  options?: any
  phase?: 'pre' | 'post'
  meta: {
    importId: string
    import: string
  }
}

export interface ServerOptions extends PluginOptions {
  enabled?: boolean

  /**
   * Server modules are executed (called) in the embedded server plugin.
   * They are NOT Feathers `app.configure` plugins.
   *
   * Resolution order (stable):
   * 1) scanned from moduleDirs (in order)
   * 2) explicit modules list (in order)
   */
  moduleDirs?: string | string[]
  modules?: ServerModuleEntry | ServerModuleEntry[]
  loadOrder?: Array<'modules:pre' | 'plugins' | 'services' | 'modules:post'>

  /**
   * Apply "secure defaults" middleware preset for the embedded REST server (Express only for now):
   * - CORS (enabled by default)
   * - compression
   * - helmet
   * - json + urlencoded body parsing
   * - optional static serving
   */
  secureDefaults?: boolean

  /**
   * Fine-grained secure defaults configuration (Express only for now).
   * Set `secureDefaults: false` to disable the preset entirely.
   */
  secure?: {
    cors?: boolean | Record<string, any>
    compression?: boolean | Record<string, any>
    helmet?: boolean | Record<string, any>
    bodyParser?: {
      json?: boolean | Record<string, any>
      urlencoded?: boolean | Record<string, any>
    }
    serveStatic?: false | {
      path?: string
      dir?: string
    }
  }
}

export interface ResolvedServerOptions extends ResolvedPluginOptions {
  enabled?: boolean
  loadOrder?: Array<'modules:pre' | 'plugins' | 'services' | 'modules:post'>
  secureDefaults?: boolean
  secure?: ServerOptions['secure']
  modules: ResolvedServerModule[]
}

export const serverDefaults: ServerOptions = {
  enabled: true,
  pluginDirs: [],
  plugins: [],
  moduleDirs: [],
  modules: [],
  loadOrder: ['modules:pre', 'plugins', 'services', 'modules:post'],
  secureDefaults: true,
  secure: {
    cors: true,
    compression: true,
    helmet: true,
    bodyParser: { json: true, urlencoded: true },
    serveStatic: false,
  },
}

export const serverDirDefault = 'feathers'
export const serverModulesDirDefault = 'modules'

function forceArray<T>(value?: T | T[]): T[] {
  if (!value)
    return []
  return Array.isArray(value) ? value : [value]
}

function isServerModuleObject(value: any): value is ServerModuleObject {
  return !!value && typeof value === 'object' && typeof value.src === 'string'
}

async function resolveServerModuleEntries(
  entries: ServerModuleEntry[],
  rootDir: string,
  framework: 'express' | 'koa' = 'express',
): Promise<ResolvedServerModule[]> {
  const { createResolver } = await import('@nuxt/kit')
  const { scanExports } = await import('unimport')
  const { setImportMeta } = await import('./utils')
  const rootResolver = createResolver(rootDir)
  const packageRootResolver = createResolver(new URL('../../../', import.meta.url).pathname)

  function resolveBuiltinModule(name: string) {
    const candidates = [
      packageRootResolver.resolve(`dist/runtime/server/modules/${framework}/${name}.js`),
      packageRootResolver.resolve(`src/runtime/server/modules/${framework}/${name}.ts`),
      packageRootResolver.resolve(`src/runtime/server/modules/${framework}/${name}.js`),
    ]

    return candidates.find(path => existsSync(path)) || candidates[0]
  }

  const builtins: Record<string, string> = {
    'secure-defaults': resolveBuiltinModule('secure-defaults'),
    'cors': resolveBuiltinModule('cors'),
    'helmet': resolveBuiltinModule('helmet'),
    'compression': resolveBuiltinModule('compression'),
    'body-parser': resolveBuiltinModule('body-parser'),
    'serve-static': resolveBuiltinModule('serve-static'),
    'healthcheck': resolveBuiltinModule('healthcheck'),
    'rate-limit': resolveBuiltinModule('rate-limit'),
  }

  const toResolvedBuiltin = (from: string, options?: any, phase: 'pre' | 'post' = 'pre') => {
    const builtinImport = setImportMeta({ name: 'default', from } as Import) as ResolvedServerModule
    if (options !== undefined)
      builtinImport.options = options
    builtinImport.phase = phase
    return builtinImport
  }

  const resolved: ResolvedServerModule[] = []

  for (const entry of entries) {
    if (isServerModuleObject(entry)) {
      if (entry.enabled === false)
        continue
      const phase = entry.phase === 'post' ? 'post' : 'pre'
      const builtin = builtins[entry.src]
      if (builtin) {
        resolved.push(toResolvedBuiltin(builtin, entry.options, phase))
        continue
      }
      const target = rootResolver.resolve(entry.src)
      const imports = await scanExports(target, false)
      const picked = imports.find(i => i.name === 'default') || imports[0]
      if (!picked)
        continue
      const moduleImport = setImportMeta(picked) as ResolvedServerModule
      moduleImport.options = entry.options
      moduleImport.phase = phase
      resolved.push(moduleImport)
      continue
    }

    if (typeof entry === 'string') {
      const builtin = builtins[entry]
      if (builtin) {
        resolved.push(toResolvedBuiltin(builtin, undefined, 'pre'))
        continue
      }
      const target = rootResolver.resolve(entry)
      const imports = await scanExports(target, false)
      const picked = imports.find(i => i.name === 'default') || imports[0]
      if (!picked)
        continue
      const moduleImport = setImportMeta(picked) as ResolvedServerModule
      moduleImport.phase = 'pre'
      resolved.push(moduleImport)
      continue
    }

    const moduleImport = setImportMeta(entry) as ResolvedServerModule
    moduleImport.phase = 'pre'
    resolved.push(moduleImport)
  }

  return resolved.filter((plugin, index, self) =>
    index === self.findIndex(p =>
      p.from === plugin.from
      && JSON.stringify((p as any).options) === JSON.stringify((plugin as any).options),
    ),
  )
}

function hasMeaningfulValue(value: any): boolean {
  if (value === false || value === undefined || value === null)
    return false
  if (value === true)
    return true
  if (Array.isArray(value))
    return value.length > 0
  if (typeof value === 'object')
    return Object.keys(value).length > 0
  return true
}

function hasExplicitBuiltin(entries: ServerModuleEntry[], name: string): boolean {
  return entries.some((entry) => {
    if (typeof entry === 'string')
      return entry === name
    if (isServerModuleObject(entry))
      return entry.src === name
    return false
  })
}

function buildSecureServerModules(server: ModuleOptions['server']): ServerModuleObject[] {
  const out: ServerModuleObject[] = []
  const secureDefaults = (server as any)?.secureDefaults !== false
  const secure = ((server as any)?.secure || {}) as NonNullable<ServerOptions['secure']>

  const push = (src: string, options?: any) => {
    if (options === false)
      return
    out.push({ src, options: options === undefined ? true : options, phase: 'pre' })
  }

  const bodyParser = secure.bodyParser
  const bodyParserOptions = {
    json: bodyParser?.json === undefined ? secureDefaults : bodyParser?.json,
    urlencoded: bodyParser?.urlencoded === undefined ? secureDefaults : bodyParser?.urlencoded,
  }

  if (hasMeaningfulValue(bodyParserOptions.json) || hasMeaningfulValue(bodyParserOptions.urlencoded))
    push('body-parser', bodyParserOptions)

  const cors = secure.cors === undefined ? secureDefaults : secure.cors
  if (hasMeaningfulValue(cors))
    push('cors', cors)

  const helmet = secure.helmet === undefined ? secureDefaults : secure.helmet
  if (hasMeaningfulValue(helmet))
    push('helmet', helmet)

  const compression = secure.compression === undefined ? secureDefaults : secure.compression
  if (hasMeaningfulValue(compression))
    push('compression', compression)

  const serveStatic = secure.serveStatic
  if (serveStatic)
    push('serve-static', serveStatic)

  return out
}

export async function resolveServerOptions(
  server: ModuleOptions['server'],
  rootDir: string,
  serverDir: string,
  framework: 'express' | 'koa' = 'express',
): Promise<ResolvedServerOptions> {
  const serverResolver = createResolver(serverDir)

  const resolvedPlugins = await resolvePluginsOptions(server, rootDir, serverResolver.resolve(serverDirDefault))

  // Resolve server modules: scan first, normalized secure modules second, explicit list third
  const moduleDirs = forceArray((server as any)?.moduleDirs)
  const explicitModules = forceArray((server as any)?.modules) as ServerModuleEntry[]
  const normalizedSecureModules = buildSecureServerModules(server)
    .filter(entry => !hasExplicitBuiltin(explicitModules, entry.src))

  const modulesOptions: PluginOptions = {
    pluginDirs: moduleDirs,
    plugins: [],
  }

  const resolvedModulesFromDirs = await resolvePluginsOptions(
    modulesOptions,
    rootDir,
    serverResolver.resolve(serverDirDefault, serverModulesDirDefault),
  )
  const resolvedNormalizedSecureModules = await resolveServerModuleEntries(normalizedSecureModules, rootDir, framework)
  const resolvedModulesFromEntries = await resolveServerModuleEntries(explicitModules, rootDir, framework)

  return {
    ...resolvedPlugins,
    enabled: (server as any)?.enabled ?? serverDefaults.enabled,
    loadOrder: forceArray((server as any)?.loadOrder).length ? forceArray((server as any)?.loadOrder) as any : serverDefaults.loadOrder,
    secureDefaults: (server as any)?.secureDefaults ?? serverDefaults.secureDefaults,
    secure: (server as any)?.secure ?? serverDefaults.secure,
    modules: [
      ...(resolvedModulesFromDirs.plugins as ResolvedServerModule[]),
      ...resolvedNormalizedSecureModules,
      ...resolvedModulesFromEntries,
    ],
  }
}
