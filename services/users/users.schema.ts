// For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html

import type { HookContext } from 'nuxt-feathers-zod/server'
import type { UserService } from './users.class'
import { passwordHash } from '@feathersjs/authentication-local'
import { resolve } from '@feathersjs/schema'
import { zodQuerySyntax } from 'nuxt-feathers-zod/query'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'

// Main data model schema
export const userSchema = z.object({
  id: z.number().int(),
  userId: z.string(),
  password: z.string().optional(),
})
export type User = z.infer<typeof userSchema>
export const userValidator = getZodValidator(userSchema, { kind: 'data' })
export const userResolver = resolve<User, HookContext<UserService>>({})

export const userExternalResolver = resolve<User, HookContext<UserService>>({
  // The password should never be visible externally
  password: async () => undefined,
})

// Schema for creating new entries
export const userDataSchema = userSchema.pick({
  userId: true,
  password: true,
})
export type UserData = z.infer<typeof userDataSchema>
export const userDataValidator = getZodValidator(userDataSchema, { kind: 'data' })
export const userDataResolver = resolve<User, any>({
  password: passwordHash({ strategy: 'local' }),
})

// Schema for updating existing entries
export const userPatchSchema = userSchema.partial()
export type UserPatch = z.infer<typeof userPatchSchema>
export const userPatchValidator = getZodValidator(userPatchSchema, { kind: 'data' })
export const userPatchResolver = resolve<User, any>({
  password: passwordHash({ strategy: 'local' }),
})

// Schema for allowed query properties
export const userQuerySchema = zodQuerySyntax(userSchema.pick({ id: true, userId: true }))
export type UserQuery = z.infer<typeof userQuerySchema>
export const userQueryValidator = getZodValidator(userQuerySchema, { kind: 'query' })
export const userQueryResolver = resolve<UserQuery, HookContext<UserService>>({
  // If there is a user (e.g. with authentication), they are only allowed to see their own data
  id: async (value: unknown, _user: unknown, context: HookContext<UserService>) => {
    const authUser = (context.params as any).user
    if (authUser)
      return authUser.id
    return value
  },
})
