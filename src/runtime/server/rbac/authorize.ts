import type { HookContext } from '@feathersjs/feathers'
import type { RbacFile, RbacMethod } from './types'
import { Forbidden } from '@feathersjs/errors'
import { extractRolesKeycloak, extractRolesLocal } from './extractRoles'

export interface RbacAuthorizeOptions {
  /** Legacy provider hint; params.principal.roles is preferred when available. */
  provider?: string
  /** Keycloak clientId for resource_access roles */
  keycloakClientId?: string
  /** deny by default if no policy matches */
  denyByDefault: boolean
  /** paths to skip (auth bridge, swagger, internal) */
  skipPaths?: string[]
}

function normalizeMethod(m: string): RbacMethod | null {
  if (m === 'find' || m === 'get' || m === 'create' || m === 'update' || m === 'patch' || m === 'remove')
    return m
  return null
}

export function createAuthorizeHook(getRbac: () => RbacFile, opts: RbacAuthorizeOptions) {
  const skip = new Set(opts.skipPaths || ['authentication', '_keycloak'])
  return async (context: HookContext) => {
    const method = normalizeMethod(context.method)
    const path = (context.path || '').replace(/^\//, '')
    if (!method || !path)
      return context
    if (skip.has(path))
      return context

    const rbac = getRbac()
    if (!rbac?.enabled)
      return context

    const required = rbac.policies?.[path]?.[method]
    if (!required || required.length === 0) {
      if (opts.denyByDefault)
        throw new Forbidden('Forbidden')
      return context
    }

    const principalRoles: string[] = Array.isArray(context.params?.principal?.roles)
      ? context.params.principal.roles.map(String)
      : []
    const user = context.params?.user
    const roles: string[] = principalRoles.length
      ? principalRoles
      : opts.provider === 'keycloak'
        ? extractRolesKeycloak(user, opts.keycloakClientId)
        : extractRolesLocal(user)

    const allow = roles.some((role: string) => required.includes(role))
    if (!allow)
      throw new Forbidden('Forbidden')
    return context
  }
}
