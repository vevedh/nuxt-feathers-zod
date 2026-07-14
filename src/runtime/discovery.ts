import type { Import } from 'unimport'
import type { ServicesDirs } from './options/services'

import { scanDirExports } from 'unimport'

import { filterExports } from './options/utils'

type DiscoveryKind = 'schemas' | 'server-services' | 'client-services'

const cache = new Map<string, Promise<Import[]>>()

function cacheKey(kind: DiscoveryKind, servicesDirs: ServicesDirs): string {
  return `${kind}:${[...servicesDirs].sort().join('|')}`
}

function cloneImports(imports: Import[]): Import[] {
  return imports.map((item) => {
    const clone: Import = { ...item }
    if (item.meta)
      clone.meta = { ...item.meta }
    return clone
  })
}

async function scan(kind: DiscoveryKind, servicesDirs: ServicesDirs): Promise<Import[]> {
  if (kind === 'schemas') {
    const exports = await scanDirExports(servicesDirs, {
      filePatterns: ['**/*.schema.ts'],
    })
    return exports.filter(({ type }) => type)
  }

  if (kind === 'client-services') {
    const services = await scanDirExports(servicesDirs, {
      filePatterns: ['**/*.shared.ts'],
      fileFilter: file => /\.shared\.ts$/.test(file),
      types: false,
    })
    return services.filter(({ name }) => /Client|default$/.test(name))
  }

  const services = await scanDirExports(servicesDirs, {
    filePatterns: ['**/*.ts'],
    types: false,
  })
  return services
    .filter(({ from }) => !/\w+\.\w+\.ts$/.test(from))
    .filter(filterExports)
}

async function discover(kind: DiscoveryKind, servicesDirs: ServicesDirs): Promise<Import[]> {
  const key = cacheKey(kind, servicesDirs)
  let pending = cache.get(key)
  if (!pending) {
    pending = scan(kind, servicesDirs)
    cache.set(key, pending)
  }

  try {
    return cloneImports(await pending)
  }
  catch (error) {
    cache.delete(key)
    throw error
  }
}

export async function discoverSchemaTypes(servicesDirs: ServicesDirs): Promise<Import[]> {
  return discover('schemas', servicesDirs)
}

export async function discoverServerServices(servicesDirs: ServicesDirs): Promise<Import[]> {
  return discover('server-services', servicesDirs)
}

export async function discoverClientServices(servicesDirs: ServicesDirs): Promise<Import[]> {
  return discover('client-services', servicesDirs)
}

export function clearDiscoveryCache(): void {
  cache.clear()
}
