// Shared client registration for the users service.

import type { Params } from '@feathersjs/feathers'
import type { ClientApplication } from 'nuxt-feathers-zod/client'
import type { User, UserData, UserPatch, UserQuery, UserService } from './users.class'

export type { User, UserData, UserPatch, UserQuery }

export type UserClientService = Pick<UserService<Params<UserQuery>>, (typeof userMethods)[number]>

export const userPath = 'users'

export const userMethods: Array<keyof UserService> = ['find', 'get', 'create', 'patch', 'remove']

export function userClient(client: ClientApplication) {
  const connection = client.get('connection')

  client.use(userPath, connection.service(userPath), {
    methods: userMethods,
  })
}

declare module 'nuxt-feathers-zod/client' {
  interface ServiceTypes {
    [userPath]: UserClientService
  }
}
