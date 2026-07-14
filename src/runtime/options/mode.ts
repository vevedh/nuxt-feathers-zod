import type { ResolvedOptions } from '.'
import type { ResolvedClientOptionsOrDisabled } from './client'

export type FeathersClientMode = 'embedded' | 'remote'

export function getResolvedClientMode(client: ResolvedClientOptionsOrDisabled | undefined): FeathersClientMode {
  if (client && typeof client === 'object' && client.mode === 'remote')
    return 'remote'
  return 'embedded'
}

export function isRemoteClientMode(client: ResolvedClientOptionsOrDisabled | undefined): boolean {
  return getResolvedClientMode(client) === 'remote'
}

export function detectResolvedMode(options: Pick<ResolvedOptions, 'client'>): FeathersClientMode {
  return getResolvedClientMode(options.client)
}

export function isResolvedServerEnabled(options: Pick<ResolvedOptions, 'client' | 'server'>): boolean {
  const server: any = options.server || {}
  if (typeof server.enabled === 'boolean')
    return server.enabled
  return detectResolvedMode(options) !== 'remote'
}

export function isResolvedRemoteAuthEnabled(options: Pick<ResolvedOptions, 'client'>): boolean {
  const client: any = options.client
  return Boolean(getResolvedClientMode(options.client) === 'remote' && client?.remote?.auth?.enabled)
}
