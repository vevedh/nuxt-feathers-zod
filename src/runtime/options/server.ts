import type { Import } from 'unimport'

import type { ModuleOptions } from '.'
import type { PluginOptions, ResolvedPluginOptions, ResolvedPlugins } from './plugins'
import { createResolver } from '@nuxt/kit'
import { resolvePluginsOptions } from './plugins'

export interface ServerModuleObject {
  src: string
  options?: any
  enabled?: boolean
}

export type ServerModuleEntry = string | Import | ServerModuleObject

export interface ResolvedServerModule extends Import {
  options?: any
  meta: {
    importId: string
    import: string
  }
}

export interface ServerOptions extends PluginOptions {
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
  modules: ResolvedServerModule[]
}

export const serverDefaults: ServerOptions = {
  pluginDirs: [],
  plugins: [],
  moduleDirs: [],
  modules: [],
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
  // IMPORTANT: builtin server modules are resolved from the package source tree,
  // not from dist/. nuxt-module-build does not guarantee copying these dynamically
  // scanned files into dist/runtime/server/modules, but the source tree can be
  // safely shipped in the published package.
  const packageRootResolver = createResolver(new URL('../../../', import.meta.url).pathname)

  const builtinBase = `src/runtime/server/modules/${framework}`
  const builtins: Record<string, string> = {
    'secure-defaults': packageRootResolver.resolve(`${builtinBase}/secure-defaults.ts`),
    'cors': packageRootResolver.resolve(`${builtinBase}/cors.ts`),
    'helmet': packageRootResolver.resolve(`${builtinBase}/helmet.ts`),
    'compression': packageRootResolver.resolve(`${builtinBase}/compression.ts`),
    'body-parser': packageRootResolver.resolve(`${builtinBase}/body-parser.ts`),
    'serve-static': packageRootResolver.resolve(`${builtinBase}/serve-static.ts`),
    'healthcheck': packageRootResolver.resolve(`${builtinBase}/healthcheck.ts`),
    'rate-limit': packageRootResolver.resolve(`${builtinBase}/rate-limit.ts`),
  }

  const toResolvedBuiltin = (from: string, options?: any) => {
    const builtinImport = setImportMeta({ name: 'default', from } as Import) as ResolvedServerModule
    if (options !== undefined)
      builtinImport.options = options
    return builtinImport
  }

  const resolved: ResolvedServerModule[] = []

  for (const entry of entries) {
    if (isServerModuleObject(entry)) {
      if (entry.enabled === false)
        continue
      const builtin = builtins[entry.src]
      if (builtin) {
        resolved.push(toResolvedBuiltin(builtin, entry.options))
        continue
      }
      const target = rootResolver.resolve(entry.src)
      const imports = await scanExports(target, false)
      const picked = imports.find(i => i.name === 'default') || imports[0]
      if (!picked)
        continue
      const moduleImport = setImportMeta(picked) as ResolvedServerModule
      moduleImport.options = entry.options
      resolved.push(moduleImport)
      continue
    }

    if (typeof entry === 'string') {
      const builtin = builtins[entry]
      if (builtin) {
        resolved.push(toResolvedBuiltin(builtin))
        continue
      }
      const target = rootResolver.resolve(entry)
      const imports = await scanExports(target, false)
      const picked = imports.find(i => i.name === 'default') || imports[0]
      if (!picked)
        continue
      resolved.push(setImportMeta(picked) as ResolvedServerModule)
      continue
    }

    resolved.push(setImportMeta(entry) as ResolvedServerModule)
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
    out.push({ src, options: options === undefined ? true : options })
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
    modules: [
      ...(resolvedModulesFromDirs.plugins as ResolvedServerModule[]),
      ...resolvedNormalizedSecureModules,
      ...resolvedModulesFromEntries,
    ],
  }
}
