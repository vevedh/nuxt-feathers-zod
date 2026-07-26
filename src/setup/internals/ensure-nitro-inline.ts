export interface NitroExternalsLike {
  inline?: boolean | Array<unknown>
}

export interface NitroConfigWithExternals {
  externals?: NitroExternalsLike
}

/**
 * Keep a runtime peer inside Nitro's server bundle.
 *
 * Nitro can otherwise externalize a different nested version of the same
 * package when the application dependency graph contains multiple majors.
 */
export function ensureNitroDependencyInline(
  nitroConfig: NitroConfigWithExternals,
  dependency: string,
): void {
  nitroConfig.externals ||= {}

  if (nitroConfig.externals.inline === true)
    return

  const inline = Array.isArray(nitroConfig.externals.inline)
    ? nitroConfig.externals.inline
    : []

  if (!inline.includes(dependency))
    inline.push(dependency)

  nitroConfig.externals.inline = inline
}
