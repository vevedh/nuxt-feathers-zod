import type { ResolvedTransportsOptions } from './transports'

export interface SwaggerOptions {
  /**
   * Enable Swagger/OpenAPI documentation generation via feathers-swagger (legacy).
   * When `true`, defaults are applied.
   */
  enabled?: boolean
  /** Swagger UI base path (e.g. /docs) */
  docsPath?: string
  /** OpenAPI JSON path (e.g. /docs.json) */
  docsJsonPath?: string
  /** OpenAPI version (2 or 3). Default: 3 */
  openApiVersion?: 2 | 3
  /** OpenAPI info */
  info?: {
    title: string
    description?: string
    version: string
  }
}

export type SwaggerOptionsOrDisabled = SwaggerOptions | boolean

export interface ResolvedSwaggerOptions {
  enabled: true
  docsPath: string
  docsJsonPath: string
  openApiVersion: 2 | 3
  info: {
    title: string
    description?: string
    version: string
  }
}

export type ResolvedSwaggerOptionsOrDisabled = ResolvedSwaggerOptions | false

export function resolveSwaggerOptions(options: SwaggerOptionsOrDisabled | undefined, transports: ResolvedTransportsOptions): ResolvedSwaggerOptionsOrDisabled {
  // Explicitly handle disabled / not set before any narrowing
  if (options == null || options === false)
    return false

  // Allow shorthand: swagger: true
  if (options === true)
    options = {}

  const enabled = options.enabled ?? true
  if (!enabled)
    return false

  return {
    enabled: true,
    docsPath: options.docsPath || '/docs',
    docsJsonPath: options.docsJsonPath || '/docs.json',
    openApiVersion: options.openApiVersion || 3,
    info: options.info || { title: 'API Docs', version: '1.0.0' },
  }
}
