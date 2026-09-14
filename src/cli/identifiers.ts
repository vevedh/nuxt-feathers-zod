import type { Adapter, ServiceIdStrategy } from './core/types'

export const SERVICE_ID_STRATEGIES = ['objectid', 'uuid', 'integer', 'bigint', 'string'] as const

const strategySupport: Record<Adapter, readonly ServiceIdStrategy[]> = {
  memory: ['integer', 'uuid', 'string'],
  mongodb: ['objectid', 'uuid', 'string'],
  knex: ['integer', 'bigint', 'uuid', 'string'],
}

export function getDefaultServiceIdStrategy(adapter: Adapter): ServiceIdStrategy {
  return adapter === 'mongodb' ? 'objectid' : 'integer'
}

export function isServiceIdStrategySupported(adapter: Adapter, strategy: ServiceIdStrategy): boolean {
  return strategySupport[adapter].includes(strategy)
}

export function resolveServiceIdStrategy(adapter: Adapter, strategy?: ServiceIdStrategy): ServiceIdStrategy {
  const resolved = strategy ?? getDefaultServiceIdStrategy(adapter)
  if (!isServiceIdStrategySupported(adapter, resolved)) {
    throw new Error(
      `Invalid service identifier strategy: --idStrategy ${resolved} is not supported with --adapter ${adapter}. Supported strategies: ${strategySupport[adapter].join(', ')}.`,
    )
  }
  return resolved
}

export function serviceIdFieldType(strategy: ServiceIdStrategy): string {
  switch (strategy) {
    case 'objectid':
      return 'id'
    case 'uuid':
      return 'uuid'
    case 'integer':
      return 'integer'
    case 'bigint':
      return 'bigint'
    case 'string':
      return 'string'
  }
}

export function serviceIdJsonType(strategy: ServiceIdStrategy): 'number' | 'string' {
  return strategy === 'integer' ? 'number' : 'string'
}
