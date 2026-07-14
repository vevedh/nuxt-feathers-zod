import type { NfzInfrastructureHandlers } from './types'

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
  const mongoConfig = config?.database?.mongo
  const mongoEnabled = Boolean(mongoConfig?.enabled && mongoConfig?.url)

  if (mongoEnabled) {
    app.set('mongodb', mongoConfig.url)
    app.set('mongoPath', normalizeMongoPath(mongoConfig.management?.basePath || '/mongo'))
  }

  if (config?.auth?.enabled !== false && typeof handlers.authentication === 'function')
    await handlers.authentication(app)

  if (mongoEnabled && typeof handlers.mongodb === 'function')
    await handlers.mongodb(app)
}
