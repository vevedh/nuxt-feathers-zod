import { resolve } from 'node:path'

export interface TemplatesOptions {
  /**
   * One or more directories (relative to Nuxt rootDir) containing override templates.
   *
   * Each file path is matched by relative key, e.g.:
   * - key: "server/plugin.ts"
   * - file: "<dir>/server/plugin.ts"
   */
  dirs?: string[] | string

  /**
   * When true, unknown/unauthorized overrides cause a hard error.
   * When false, they are ignored with a warning.
   */
  strict?: boolean

  /**
   * Allowed override keys (glob-lite patterns, e.g. "server/*.ts", "client/**").
   * If omitted, a safe default allow-list is used.
   */
  allow?: string[]
}

export interface ResolvedTemplatesOptions {
  enabled: boolean
  dirs: string[]
  strict: boolean
  allow: string[]
}

export const templatesDefaults: ResolvedTemplatesOptions = {
  enabled: false,
  dirs: [],
  strict: true,
  allow: [
    // Allow overriding any nested server/client templates (modules, helpers, etc.)
    // while still keeping the key-space constrained under "server/" and "client/".
    'server/**/*.ts',
    'client/**/*.ts',
    // Allow overriding generated type helpers when needed.
    'types/**/*.d.ts',
  ],
}

export function resolveTemplatesOptions(input: TemplatesOptions | undefined, rootDir: string): ResolvedTemplatesOptions {
  if (!input)
    return { ...templatesDefaults }

  const dirsRaw = (Array.isArray(input.dirs) ? input.dirs : (typeof input.dirs === 'string' ? [input.dirs] : []))
    .filter(Boolean)
  const dirs = dirsRaw.map(d => resolve(rootDir, d))

  const enabled = dirs.length > 0
  const strict = input.strict ?? templatesDefaults.strict
  const allow = (input.allow && input.allow.length) ? input.allow : templatesDefaults.allow

  return {
    enabled,
    dirs,
    strict,
    allow,
  }
}
