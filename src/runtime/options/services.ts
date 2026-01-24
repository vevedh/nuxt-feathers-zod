import type { ModuleOptions } from '.'
import { createResolver } from '@nuxt/kit'

export type ServicesDir = string
export type ServicesDirs = Array<ServicesDir>

export type ResolvedServicesDirs = [ServicesDir, ...ServicesDir[]]

export const servicesDirDefault: ServicesDir = 'services'

export function resolveServicesDirs(servicesDirs: ModuleOptions['servicesDirs'], rootDir: string): ResolvedServicesDirs {
  const resolvedServicesDirs: ServicesDirs = []

  if (typeof servicesDirs === 'string' && servicesDirs)
    resolvedServicesDirs.push(servicesDirs)

  if (Array.isArray(servicesDirs) && servicesDirs.find(v => v))
    resolvedServicesDirs.push(...servicesDirs.filter(v => v))

  if (!resolvedServicesDirs.length)
    resolvedServicesDirs.push(servicesDirDefault)

  const rootResolver = createResolver(rootDir)
  return resolvedServicesDirs.map(dir => rootResolver.resolve(dir)) as ResolvedServicesDirs
}
