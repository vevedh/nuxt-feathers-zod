import { existsSync } from 'node:fs'

/**
 * Resolve NFZ runtime files in both source/dev and packaged dist layouts.
 *
 * - source/dev: src/setup/* -> src/runtime/**
 * - package/dist: dist/module.mjs -> dist/runtime/**
 *
 * Nuxt plugin annotation reads the returned file directly, so this helper
 * returns a concrete path with a real extension whenever possible.
 */
export function resolveRuntimePath(
  resolver: { resolve: (...paths: string[]) => string },
  relativePath: string,
): string {
  const normalized = relativePath
    .replace(/^\/+/, '')
    .replace(/\.(?:mjs|cjs|js|ts)$/, '')

  const candidates = [
    resolver.resolve('./runtime', `${normalized}.js`),
    resolver.resolve('./runtime', `${normalized}.mjs`),
    resolver.resolve('../runtime', `${normalized}.ts`),
    resolver.resolve('../runtime', `${normalized}.js`),
    resolver.resolve('../runtime', normalized),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate))
      return candidate
  }

  return candidates[0]
}
