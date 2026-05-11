import type { HookContext } from '@feathersjs/feathers'
import { authenticate } from '@feathersjs/authentication'
import { Forbidden, NotAuthenticated } from '@feathersjs/errors'

const authenticateJwt = authenticate('jwt')

type UserLike = {
  _id?: string
  id?: string
  email?: string
  roles?: string[]
  groups?: string[]
  isAdmin?: boolean
}

function isAdmin(user: UserLike | undefined): boolean {
  if (!user) {
    return false
  }

  if (user.isAdmin) {
    return true
  }

  const roles = [...(user.roles ?? []), ...(user.groups ?? [])]
    .map((role) => role.toLowerCase())

  return roles.includes('admin')
}

async function authenticateExternal(context: HookContext): Promise<HookContext> {
  if (!context.params.provider) {
    return context
  }

  return await authenticateJwt(context) as HookContext
}

function requireAdmin(context: HookContext): HookContext {
  if (!context.params.provider) {
    return context
  }

  if (!isAdmin(context.params.user as UserLike | undefined)) {
    throw new Forbidden('Accès admin requis')
  }

  return context
}

function allowSelfOrAdmin(context: HookContext): HookContext {
  if (!context.params.provider) {
    return context
  }

  const user = context.params.user as UserLike | undefined

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
    remove: [requireAdmin]
  },
  after: {
    all: []
  },
  error: {
    all: []
  }
}
