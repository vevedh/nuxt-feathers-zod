import type { Import } from 'unimport'
import type { ModuleImport } from './utils'
import { createResolver } from '@nuxt/kit'
import { scanDirExports, scanExports } from 'unimport'
import { filterExports, setImportsMeta } from './utils'

export type PluginDir = string
export type PluginDirs = Array<PluginDir>

export type Plugin = string | Import
export type Plugins = Array<Plugin>

export type Imports = Array<Import>

export type ResolvedPlugins = Array<ModuleImport>

export interface PluginOptions {
  pluginDirs?: PluginDir | PluginDirs
  plugins?: Plugin | Plugins
}

export interface ResolvedPluginOptions {
  plugins: ResolvedPlugins
}

function forceArray<T>(value?: T | T[]): T[] {
  if (!value)
    return []
  return Array.isArray(value) ? value : [value]
}

export function preparePluginOptions(pluginOptions: PluginOptions): PluginOptions {
  const { pluginDirs, plugins } = pluginOptions
  return {
    ...pluginOptions,
    pluginDirs: forceArray(pluginDirs),
    plugins: forceArray(plugins),
  }
}

export function resolvePluginDirs(pluginDirs: PluginDir | PluginDirs | undefined, rootDir: string, defaultDir: string): PluginDirs {
  const rootResolver = createResolver(rootDir)

  const resolvedPluginDirs: PluginDirs = []

  if (pluginDirs && typeof pluginDirs === 'string') {
    resolvedPluginDirs.push(pluginDirs)
  }
  else if (pluginDirs?.length) {
    resolvedPluginDirs.push(...pluginDirs)
  }
  else {
    resolvedPluginDirs.push(defaultDir)
  }

  return resolvedPluginDirs.map(dir => rootResolver.resolve(dir))
}

export async function resolvePluginsFromPluginDirs(pluginDirs: PluginDirs): Promise<ResolvedPlugins> {
  const imports = await scanDirExports(pluginDirs, {
    filePatterns: ['*.ts'],
    types: false,
  })

  const filteredImports = imports.filter(filterExports)
  const resolvedPlugins = setImportsMeta(filteredImports)
  return resolvedPlugins
}

export async function resolvePlugins(plugins: Plugin | Plugins | undefined, rootDir: string): Promise<ResolvedPlugins> {
  if (!plugins)
    return []

  const rootResolver = createResolver(rootDir)

  const filteredImports: Imports = []
  for (const plugin of Array.isArray(plugins) ? plugins : [plugins]) {
    if (typeof plugin === 'string') {
      const imports = await scanExports(rootResolver.resolve(plugin), false)
      filteredImports.push(...imports.filter(filterExports))
    }
    else {
      filteredImports.push(plugin)
    }
  }

  const resolvedPlugins = setImportsMeta(filteredImports)
  return resolvedPlugins
}

function removeDuplicates(plugins: ResolvedPlugins): ResolvedPlugins {
  return plugins.filter((plugin, index, self) =>
    index === self.findIndex(p => p.from === plugin.from),
  )
}

export async function resolvePluginsOptions(pluginOptions: PluginOptions, rootDir: string, defaultDir: string): Promise<ResolvedPluginOptions> {
  const pluginDirs = resolvePluginDirs(pluginOptions.pluginDirs, rootDir, defaultDir)

  const resolvedPlugins: ResolvedPlugins = [
    ...await resolvePluginsFromPluginDirs(pluginDirs),
    ...await resolvePlugins(pluginOptions.plugins, rootDir),
  ]

  const resolvedPluginOptions: ResolvedPluginOptions = {
    plugins: removeDuplicates(resolvedPlugins),
  }

  return resolvedPluginOptions
}
