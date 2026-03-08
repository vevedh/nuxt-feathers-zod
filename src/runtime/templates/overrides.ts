import type { ResolvedOptions } from '../options'

import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'

export type TemplateKey = string

export interface ResolvedTemplateOverride {
  key: TemplateKey
  absPath: string
  dir: string
}

/**
 * Very small glob-lite matcher:
 * - supports "*" for a single path segment (no "/")
 * - supports "**" for any nested path
 */
export function matchGlobLite(pattern: string, value: string): boolean {
  // Normalize to posix-ish slashes for matching keys
  const p = pattern.replace(/\\/g, '/')
  const v = value.replace(/\\/g, '/')

  // Escape regex special chars except * and /
  const esc = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&')

  const parts = p.split('/').map((seg) => {
    if (seg === '**')
      return '.*'
    // "*" -> any chars except "/"
    return esc(seg).replace(/\*/g, '[^/]*')
  })
  const re = new RegExp(`^${parts.join('/')}$`)
  return re.test(v)
}

export function isKeyAllowed(key: TemplateKey, allow: string[]): boolean {
  return allow.some(p => matchGlobLite(p, key))
}

export function keyFromGeneratedFilename(filename: string): TemplateKey | null {
  const norm = filename.replace(/\\/g, '/')
  if (!norm.startsWith('feathers/'))
    return null
  return norm.slice('feathers/'.length)
}

export function resolveTemplateOverrideForFilename(
  filename: string,
  options: ResolvedOptions,
): ResolvedTemplateOverride | null {
  const key = keyFromGeneratedFilename(filename)
  if (!key)
    return null

  const t = options.templates
  if (!t?.enabled)
    return null

  // only consider overrides that are explicitly allowed
  if (!isKeyAllowed(key, t.allow)) {
    // if an override file exists but is not allowed, either hard-error or ignore
    for (const dir of t.dirs) {
      const cand = join(dir, key)
      if (existsSync(cand)) {
        const msg = `[nuxt-feathers-zod] templates override blocked by allow-list: ${key} (found in ${relative(options.templateDir ?? process.cwd(), cand)})`
        if (t.strict)
          throw new Error(msg)
        console.warn(msg)
      }
    }
    return null
  }

  for (const dir of t.dirs) {
    const cand = join(dir, key)
    if (existsSync(cand)) {
      return { key, absPath: cand, dir }
    }
  }

  return null
}
