import type { HookContext } from '@feathersjs/feathers'
import { Forbidden, NotAuthenticated } from '@feathersjs/errors'
import { authenticateNfz } from 'nuxt-feathers-zod/server-auth'

const authenticateProvider = authenticateNfz()

interface UserLike {
  _id?: string
  id?: string
  email?: string
  roles?: string[]
  groups?: string[]
  isAdmin?: boolean
}

function resolveIdentity(context: HookContext): UserLike | undefined {
  return (context.params.principal || context.params.user) as UserLike | undefined
}

function isAdmin(user: UserLike | undefined): boolean {
  if (!user) {
    return false
  }

  if (user.isAdmin) {
    return true
  }

  const roles = [...(user.roles ?? []), ...(user.groups ?? [])]
    .map(role => role.toLowerCase())

  return roles.includes('admin')
}

async function authenticateExternal(context: HookContext): Promise<HookContext> {
  if (!context.params.provider) {
    return context
  }

  return authenticateProvider(context) as Promise<HookContext>
}

function requireAdmin(context: HookContext): HookContext {
  if (!context.params.provider) {
    return context
  }

  if (!isAdmin(resolveIdentity(context))) {
    throw new Forbidden('Accès admin requis')
  }

  return context
}

function allowSelfOrAdmin(context: HookContext): HookContext {
  if (!context.params.provider) {
    return context
  }

  const user = resolveIdentity(context)

  if (!user) {
    throw new NotAuthenticated('Authentification requise')
  }

  if (isAdmin(user)) {
    return context
  }

  const requestedId = String(context.id ?? '')
  const selfIds = [user._id, user.id, user.email].filter(Boolean).map(String)

  if (!selfIds.includes(requestedId)) {
    throw new Forbidden('Accès limité au compte courant')
  }

  return context
}

export default {
  before: {
    all: [authenticateExternal],
    find: [requireAdmin],
    get: [allowSelfOrAdmin],
    create: [requireAdmin],
    update: [requireAdmin],
    patch: [requireAdmin],
    remove: [requireAdmin],
  },
  after: {
    all: [],
  },
  error: {
    all: [],
  },
}
