import type { Application } from 'nuxt-feathers-zod/server'
import type { Params } from '@feathersjs/feathers'
import { authenticate } from '@feathersjs/authentication'
import { passwordHash } from '@feathersjs/authentication-local'
import { MemoryService } from '@feathersjs/memory'
import { hooks as schemaHooks, resolve } from '@feathersjs/schema'

interface Account {
  id: number
  userId: string
  password?: string
}

type AccountData = Pick<Account, 'userId' | 'password'>
type AccountPatch = Partial<Account>
type AccountQuery = Partial<Pick<Account, 'id' | 'userId'>> & Record<string, unknown>

type AccountParams = Params<AccountQuery>

class AccountService<ServiceParams extends Params = AccountParams> extends MemoryService<Account, AccountData, ServiceParams, AccountPatch> {}

const accountResolver = resolve<Account, any>({})
const accountExternalResolver = resolve<Account, any>({
  password: async () => undefined,
})
const accountDataResolver = resolve<Account, any>({
  password: passwordHash({ strategy: 'local' }),
})
const accountPatchResolver = resolve<Account, any>({
  password: passwordHash({ strategy: 'local' }),
})

const SERVICE_PATH = 'e2e-accounts'

export default function registerAccounts(app: Application) {
  if (typeof app.service === 'function') {
    try {
      app.service(SERVICE_PATH)
      return
    }
    catch {
      // not registered yet
    }
  }

  app.use(SERVICE_PATH, new AccountService({ multi: true }), {
    methods: ['find', 'get', 'create', 'patch', 'remove'],
    events: [],
  })

  app.service(SERVICE_PATH).hooks({
    around: {
      all: [schemaHooks.resolveExternal(accountExternalResolver), schemaHooks.resolveResult(accountResolver)],
      find: [authenticate('jwt')],
      get: [authenticate('jwt')],
      create: [],
      patch: [authenticate('jwt')],
      remove: [authenticate('jwt')],
    },
    before: {
      all: [],
      find: [],
      get: [],
      create: [schemaHooks.resolveData(accountDataResolver)],
      patch: [schemaHooks.resolveData(accountPatchResolver)],
      remove: [],
    },
  })
}
