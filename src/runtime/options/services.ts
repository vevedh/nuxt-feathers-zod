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
  // Normalize + dedupe after resolving to avoid accidental duplicates like
  // ['services', './services'] which both resolve to the same absolute path.
  const seen = new Set<string>()
  const out: string[] = []
  for (const dir of resolvedServicesDirs.map(dir => rootResolver.resolve(dir))) {
    if (seen.has(dir)) continue
    seen.add(dir)
    out.push(dir)
  }
  return out as ResolvedServicesDirs
}
