import type { HookContext } from 'nuxt-feathers-zod/server'
<<<<<<< HEAD
import type { UsersService } from './users.class'

import { passwordHash } from '@feathersjs/authentication-local'
import { resolve } from '@feathersjs/schema'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
=======
import { resolve } from '@feathersjs/schema'
import { passwordHash } from '@feathersjs/authentication-local'
import { getZodValidator } from 'nuxt-feathers-zod/validators'
import { z } from 'zod'
import type { UsersService } from './users.class'
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb

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
<<<<<<< HEAD
  updatedAt: z.string().optional(),
=======
  updatedAt: z.string().optional()
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
})

export type UserData = z.infer<typeof userSchema>

export const userValidator = getZodValidator(userSchema, { kind: 'data' })

export const userResolver = resolve<UserData, HookContext<UsersService>>({})

export const userExternalResolver = resolve<UserData, HookContext<UsersService>>({
<<<<<<< HEAD
  password: async () => undefined,
=======
  password: async () => undefined
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
})

export const userDataSchema = userSchema.omit({
  _id: true,
  createdAt: true,
<<<<<<< HEAD
  updatedAt: true,
=======
  updatedAt: true
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
})

export const userDataValidator = getZodValidator(userDataSchema, { kind: 'data' })

export const userDataResolver = resolve<z.infer<typeof userDataSchema>, HookContext<UsersService>>({
<<<<<<< HEAD
  password: passwordHash({ strategy: 'local' }),
=======
  password: passwordHash({ strategy: 'local' })
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
})

export const userPatchSchema = userDataSchema.partial()
export const userPatchValidator = getZodValidator(userPatchSchema, { kind: 'data' })
export const userPatchResolver = resolve<z.infer<typeof userPatchSchema>, HookContext<UsersService>>({
<<<<<<< HEAD
  password: passwordHash({ strategy: 'local' }),
=======
  password: passwordHash({ strategy: 'local' })
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
})

export const userQuerySchema = z.object({
  email: z.string().optional(),
<<<<<<< HEAD
  status: z.enum(['active', 'disabled']).optional(),
=======
  status: z.enum(['active', 'disabled']).optional()
>>>>>>> efe40e3b9a9f0a0bef0ec181dde71d3b7073cfdb
})

export const userQueryValidator = getZodValidator(userQuerySchema, { kind: 'query' })
export const userQueryResolver = resolve<z.infer<typeof userQuerySchema>, HookContext<UsersService>>({})
