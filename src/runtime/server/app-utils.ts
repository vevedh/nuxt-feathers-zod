import type { NfzInfrastructureHandlers } from './types'
import { configureNfzCache } from './cache'

export function attachNitroApp(app: any, nitroApp: any): void {
  app.nitroApp = nitroApp
}

export function normalizeMongoPath(value: unknown): string {
  const raw = String(value || '').trim()
  if (!raw)
    return '/mongo'

  const collapsed = raw.replace(/\\+/g, '/').replace(/\/{2,}/g, '/')
  const withLeadingSlash = collapsed.startsWith('/') ? collapsed : `/${collapsed}`
  const normalized = withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, '') : withLeadingSlash
  return normalized || '/mongo'
}

export async function configureNfzInfrastructure(
  app: any,
  config: any,
  handlers: NfzInfrastructureHandlers,
): Promise<void> {
  configureNfzCache(app, config?.cache)

  if (config?.auth?.enabled !== false && typeof handlers.authentication === 'function')
    await handlers.authentication(app)

  const databaseConfig = config?.database
  const hasConnections = Boolean(databaseConfig && Object.keys(databaseConfig.connections || {}).length)
  if (hasConnections && typeof handlers.database === 'function')
    await handlers.database(app, databaseConfig)
}
