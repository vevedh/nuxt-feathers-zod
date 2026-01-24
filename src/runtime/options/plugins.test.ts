import { createResolver } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'
import { resolvePluginDirs, resolvePlugins, resolvePluginsFromPluginDirs, resolvePluginsOptions } from './plugins'
import { getImportId } from './utils'

describe('resolvePluginDirs', () => {
  const rootDir = '/root'

  it('should resolve single plugin dir', () => {
    const result = resolvePluginDirs('plugins', rootDir, 'default')
    expect(result).toEqual(['/root/plugins'])
  })

  it('should resolve multiple plugin dirs', () => {
    const result = resolvePluginDirs(['plugins', 'more-plugins'], rootDir, 'default')
    expect(result).toEqual(['/root/plugins', '/root/more-plugins'])
  })

  it('should resolve default dir if no pluginDirs provided', () => {
    const result = resolvePluginDirs(undefined, rootDir, 'default')
    expect(result).toEqual(['/root/default'])
  })
})

export const testRootDir = createResolver(import.meta.url).resolve('../../../tests')

const resolver = createResolver(testRootDir)

const channelsFrom = resolver.resolve('plugins', 'channels.ts')
const channelsImportId = getImportId(channelsFrom)
const resolvedChannelsPlugin = {
  as: 'channels',
  from: channelsFrom,
  name: 'default',
  meta: {
    importId: channelsImportId,
    import: `import ${channelsImportId} from '${channelsFrom.replace(/.ts$/, '')}'`,
  },
}

const expressFrom = resolver.resolve('plugins', 'express.ts')
const expressImportId = getImportId(expressFrom)
const resolvedExpressPlugin = {
  as: 'express',
  from: expressFrom,
  name: 'default',
  meta: {
    importId: expressImportId,
    import: `import ${expressImportId} from '${expressFrom.replace(/.ts$/, '')}'`,
  },
}

const dummyFrom = resolver.resolve('fixtures', 'dummy-server-plugin.ts')
const dummyImportId = getImportId(dummyFrom)
const resolvedDummyServerPlugin = {
  as: 'dummyServerPlugin',
  from: dummyFrom,
  name: 'dummyServerPlugin',
  meta: {
    importId: dummyImportId,
    import: `import { dummyServerPlugin as ${dummyImportId} } from '${dummyFrom.replace(/.ts$/, '')}'`,
  },
}

describe('resolvePluginsFromPluginDirs', () => {
  it('should resolve plugins from plugin dirs', async () => {
    const pluginDirs = [resolver.resolve('plugins')]

    const result = await resolvePluginsFromPluginDirs(pluginDirs)

    expect(result).toEqual(expect.arrayContaining([
      resolvedChannelsPlugin,
      resolvedExpressPlugin,
    ]))
  })
})

describe('resolvePlugins', () => {
  it('should resolve single string plugin', async () => {
    const plugin = 'plugins/express.ts'

    const result = await resolvePlugins(plugin, testRootDir)

    expect(result).toEqual([
      resolvedExpressPlugin,
    ])
  })

  it('should resolve multiple string plugins', async () => {
    const plugins = ['plugins/channels.ts', 'plugins/express.ts']

    const result = await resolvePlugins(plugins, testRootDir)

    expect(result).toEqual([
      resolvedChannelsPlugin,
      resolvedExpressPlugin,
    ])
  })

  it('should resolve undefined plugins', async () => {
    const result = await resolvePlugins(undefined, testRootDir)

    expect(result).toEqual([])
  })
})

describe('resolvePluginsOptions', () => {
  it('should resolve plugins options with custom plugins and default pluginDir', async () => {
    const pluginOptions = {
      pluginDirs: ['plugins'],
      plugins: ['fixtures/dummy-server-plugin.ts'],
    }

    const result = await resolvePluginsOptions(pluginOptions, testRootDir, 'defaultDir-not-used')

    expect(result.plugins).toEqual(expect.arrayContaining([
      resolvedChannelsPlugin,
      resolvedDummyServerPlugin,
    ]))
  })

  it('should resolve plugins options with default pluginDir', async () => {
    const pluginOptions = {}

    const result = await resolvePluginsOptions(pluginOptions, testRootDir, 'plugins')

    expect(result.plugins).toEqual(expect.arrayContaining([
      resolvedChannelsPlugin,
    ]))
  })

  it('should remove duplicated plugins', async () => {
    const pluginOptions = {
      plugins: [
        'fixtures/dummy-server-plugin.ts',
        'fixtures/dummy-server-plugin.ts',
      ],
    }

    const result = await resolvePluginsOptions(pluginOptions, testRootDir, 'defaultDir-not-used')

    expect(result.plugins[0]).toEqual(resolvedDummyServerPlugin)
    expect(result.plugins.length).toBe(1)
  })
})
