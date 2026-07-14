export function extractRolesLocal(user: any): string[] {
  const roles = user?.roles
  if (Array.isArray(roles))
    return roles.filter(Boolean).map(String)
  const permissions = user?.permissions
  if (Array.isArray(permissions))
    return permissions.filter(Boolean).map(String)
  return []
}

export function extractRolesKeycloak(user: any, clientId?: string): string[] {
  const out = new Set<string>()
  const realmRoles = user?.realm_access?.roles
  if (Array.isArray(realmRoles))
    realmRoles.forEach((r: any) => out.add(String(r)))

  if (clientId) {
    const clientRoles = user?.resource_access?.[clientId]?.roles
    if (Array.isArray(clientRoles))
      clientRoles.forEach((r: any) => out.add(String(r)))
  }

  // Optional: OAuth scopes in a space-separated string
  const scope = user?.scope
  if (typeof scope === 'string')
    scope.split(/\s+/).filter(Boolean).forEach(s => out.add(String(s)))

  return [...out]
}
