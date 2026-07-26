function normalizePath(value) {
  const source = typeof value === 'string' ? value.trim() : ''
  if (!source)
    return '/'

  const withLeadingSlash = source.startsWith('/') ? source : `/${source}`
  if (withLeadingSlash === '/')
    return '/'

  return withLeadingSlash.replace(/\/+$/g, '')
}

export function resolveMountedRoutePath(mountPath, routePath) {
  const normalizedMount = normalizePath(mountPath)
  const normalizedRoute = normalizePath(routePath)

  if (normalizedMount === '/')
    return normalizedRoute
  if (normalizedRoute === '/')
    return normalizedMount

  return `${normalizedMount}${normalizedRoute}`
}
