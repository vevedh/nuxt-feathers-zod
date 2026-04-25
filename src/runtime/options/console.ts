export interface ConsoleOptions {
  /** Enable the schema console (builder + API). Recommended: dev only. */
  enabled?: boolean
  /** Base path for pages (default: /console) */
  basePath?: string
  /** Allow write operations (POST apply). In production you usually want false. */
  allowWrite?: boolean
  /** Optional list of servicesDirs overrides. Defaults to module feathers.servicesDirs */
  servicesDirs?: string[]
}

export interface ResolvedConsoleOptions {
  enabled: boolean
  basePath: string
  allowWrite: boolean
  servicesDirs: string[]
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
    servicesDirs: (opt.servicesDirs?.length ? opt.servicesDirs : ctx.servicesDirs) as any,
  }
}
