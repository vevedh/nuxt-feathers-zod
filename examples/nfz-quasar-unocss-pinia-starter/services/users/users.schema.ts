import type { HookContext } from 'nuxt-feathers-zod/server'
import type { UserService } from './users.class'
import { passwordHash } from '@feathersjs/authentication-local'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

export const userSchema = z.object({
  _id: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  userId: z.string().min(3),
  password: z.string().optional(),
  roles: z.array(z.string()).default(['user']),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type User = z.infer<typeof userSchema>
export const userValidator = getZodValidator(userSchema, { kind: 'data' })
export const userResolver = resolve<User, HookContext<UserService>>({})

export const userExternalResolver = resolve<User, HookContext<UserService>>({
  password: async () => undefined,
})

export const userDataSchema = userSchema.pick({
  userId: true,
  password: true,
}).extend({
  roles: z.array(z.string()).optional(),
})

export type UserData = z.infer<typeof userDataSchema>
export const userDataValidator = getZodValidator(userDataSchema, { kind: 'data' })
export const userDataResolver = resolve<User, HookContext<UserService>>({
  password: passwordHash({ strategy: 'local' }),
  roles: async value => (Array.isArray(value) && value.length ? value : ['user']),
  createdAt: async () => new Date().toISOString(),
  updatedAt: async () => new Date().toISOString(),
})

export const userPatchSchema = userSchema.partial()
export type UserPatch = z.infer<typeof userPatchSchema>
export const userPatchValidator = getZodValidator(userPatchSchema, { kind: 'data' })
export const userPatchResolver = resolve<User, HookContext<UserService>>({
  password: passwordHash({ strategy: 'local' }),
  updatedAt: async () => new Date().toISOString(),
})

export const userQuerySchema = zodQuerySyntax(
  userSchema.pick({
    _id: true,
    id: true,
    userId: true,
    roles: true,
  }),
)

export type UserQuery = z.infer<typeof userQuerySchema>
export const userQueryValidator = getZodValidator(userQuerySchema, { kind: 'query' })
export const userQueryResolver = resolve<UserQuery, HookContext<UserService>>({})
