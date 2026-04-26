import type { Nuxt } from '@nuxt/schema'
import type { ResolvedOptions } from '../runtime/options'

import { addServerHandler, addServerPlugin, addTemplate, createResolver } from '@nuxt/kit'

import { addServicesImports, getServicesImports } from '../runtime/services'
import { detectResolvedMode, isResolvedServerEnabled } from '../runtime/options/mode'
import { getServerTemplates } from '../runtime/templates/server'
import { resolveTemplateOverrideForFilename } from '../runtime/templates/overrides'

export async function applyServerLayer(options: ResolvedOptions, nuxt: Nuxt): Promise<Array<{ name: string, from: string }>> {
  const resolver = createResolver(import.meta.url)
  const mode = detectResolvedMode(options)
  const serverEnabled = isResolvedServerEnabled(options)

  const servicesImports = mode === 'embedded' && serverEnabled
    ? await getServicesImports(options.servicesDirs)
    : []

  if (mode === 'embedded' && serverEnabled)
    await addServicesImports(servicesImports)

  if (!(mode === 'embedded' && serverEnabled)) {
    return servicesImports.map(item => ({
      name: item.as || item.name,
      from: item.from,
    }))
  }

  let serverPluginDst: string | undefined
  let restBridgeDst: string | undefined

  for (const serverTemplate of getServerTemplates(options)) {
    const override = resolveTemplateOverrideForFilename(serverTemplate.filename, options)
    const templateInput = (override
      ? { filename: serverTemplate.filename, src: override.absPath, write: true, options }
      : { ...serverTemplate, options }) as any
    const template = addTemplate(templateInput)

    if (serverTemplate.filename?.endsWith('server/plugin.ts') || serverTemplate.filename?.endsWith('server/plugin'))
      serverPluginDst = template.dst

    if (serverTemplate.filename?.endsWith('server/rest-bridge.ts') || serverTemplate.filename?.endsWith('server/rest-bridge'))
      restBridgeDst = template.dst
  }

  addServerPlugin(serverPluginDst ?? resolver.resolve(options.templateDir, 'server/plugin.ts'))

  const restTransport = options.transports?.rest as any
  const restPath = typeof restTransport?.path === 'string' ? restTransport.path : ''
  const restFramework = typeof restTransport?.framework === 'string' ? restTransport.framework : ''

  if (restBridgeDst && restFramework === 'express' && restPath && restPath !== '/') {
    const normalizedRestPath = restPath.startsWith('/') ? restPath : `/${restPath}`
    addServerHandler({
      route: `${normalizedRestPath}/**`,
      handler: restBridgeDst,
      middleware: true,
    })
  }

  return servicesImports.map(item => ({
    name: item.as || item.name,
    from: item.from,
  }))
}
