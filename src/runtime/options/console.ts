export interface ConsoleOptions {
  /** Enable the Feathers-first NFZ Builder/RBAC services. Recommended: dev or controlled admin tooling only. */
  enabled?: boolean
  /** Public UI mount metadata for consumers that provide their own console page (default: /console). */
  basePath?: string
  /** Allow Builder/RBAC write operations. In production you usually want false. */
  allowWrite?: boolean
  /** Optional list of servicesDirs overrides. Defaults to module feathers.servicesDirs */
  servicesDirs?: string[]
  /** Keep the deprecated /api/nfz compatibility facades. Defaults to true in 6.x. */
  legacyNitroRoutes?: boolean
}

export interface ResolvedConsoleOptions {
  enabled: boolean
  basePath: string
  allowWrite: boolean
  servicesDirs: string[]
  legacyNitroRoutes: boolean
}

function normalizeBasePath(p?: string) {
  const raw = (p || '/console').trim()
  if (!raw)
    return '/console'
  const withSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withSlash.replace(/\/+$/, '') || '/console'
}

export function resolveConsoleOptions(
  input: ConsoleOptions | boolean | undefined,
  ctx: { dev: boolean, servicesDirs: string[] },
): ResolvedConsoleOptions | undefined {
  if (!input)
    return undefined
  const opt: ConsoleOptions = typeof input === 'boolean' ? { enabled: input } : input

  const enabled = !!opt.enabled
  if (!enabled)
    return undefined

  // Default: allow write only in dev.
  const allowWrite = opt.allowWrite ?? !!ctx.dev

  return {
    enabled,
    basePath: normalizeBasePath(opt.basePath),
    allowWrite,
    servicesDirs: (opt.servicesDirs?.length ? opt.servicesDirs : ctx.servicesDirs),
    legacyNitroRoutes: opt.legacyNitroRoutes !== false,
  }
}
