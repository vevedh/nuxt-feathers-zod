import type { HookContext } from 'nuxt-feathers-zod/server'
import { resolve } from '@feathersjs/schema'
import { passwordHash } from '@feathersjs/authentication-local'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
import type { UsersService } from './users.class'

export class User {}

export const userSchema = z.object({
  _id: z.string().optional(),
  email: z.string().email(),
  password: z.string().optional(),
  displayName: z.string().optional(),
  roles: z.array(z.string()).default([]),
  groups: z.array(z.string()).default([]),
  isAdmin: z.boolean().default(false),
  status: z.enum(['active', 'disabled']).default('active'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
})

export type UserData = z.infer<typeof userSchema>

export const userValidator = getZodValidator(userSchema, { kind: 'data' })

export const userResolver = resolve<UserData, HookContext<UsersService>>({})

export const userExternalResolver = resolve<UserData, HookContext<UsersService>>({
  password: async () => undefined
})

export const userDataSchema = userSchema.omit({
  _id: true,
  createdAt: true,
  updatedAt: true
})

export const userDataValidator = getZodValidator(userDataSchema, { kind: 'data' })

export const userDataResolver = resolve<z.infer<typeof userDataSchema>, HookContext<UsersService>>({
  password: passwordHash({ strategy: 'local' })
})

export const userPatchSchema = userDataSchema.partial()
export const userPatchValidator = getZodValidator(userPatchSchema, { kind: 'data' })
export const userPatchResolver = resolve<z.infer<typeof userPatchSchema>, HookContext<UsersService>>({
  password: passwordHash({ strategy: 'local' })
})

export const userQuerySchema = z.object({
  email: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional()
})

export const userQueryValidator = getZodValidator(userQuerySchema, { kind: 'query' })
export const userQueryResolver = resolve<z.infer<typeof userQuerySchema>, HookContext<UsersService>>({})
