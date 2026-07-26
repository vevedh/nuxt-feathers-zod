import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const read = relative => readFileSync(resolve(root, relative), 'utf8')
const problems = []

function requireText(source, expected, label) {
  if (!source.includes(expected))
    problems.push(`${label}: missing ${JSON.stringify(expected)}`)
}

function forbidText(source, unexpected, label) {
  if (source.includes(unexpected))
    problems.push(`${label}: unexpected ${JSON.stringify(unexpected)}`)
}

const server = read('src/runtime/server.ts')
const authHook = read('src/runtime/auth/hook.ts')
const clientPlugin = read('src/runtime/client/defineNfzClientPlugin.ts')
const adminClient = read('examples/nfz-quasar-unocss-pinia-starter/app/composables/useAdminFeathers.ts')
const userSchema = read('examples/nfz-quasar-unocss-pinia-starter/services/users/users.schema.ts')
const messageService = read('examples/nfz-quasar-unocss-pinia-starter/services/messages/messages.ts')
const userService = read('examples/nfz-quasar-unocss-pinia-starter/services/users/users.ts')

requireText(server, "import type { Db } from 'mongodb'", 'public server MongoDB type import')
requireText(server, 'mongodbClient?: Promise<Db>', 'public server MongoDB configuration alias')
requireText(authHook, 'export type AuthenticateNfzHook = AroundHookFunction & HookFunction', 'hybrid authentication hook type')
requireText(authHook, 'Promise<void | HookContext>', 'hybrid hook implementation result')
forbidText(authHook, 'Promise<unknown>', 'untyped authentication hook result')
requireText(clientPlugin, 'as ClientApplication', 'typed Nuxt client injection')
requireText(adminClient, "import type { ClientApplication } from 'nuxt-feathers-zod/client'", 'starter client type import')
requireText(adminClient, 'function isClientApplication(value: unknown): value is ClientApplication', 'starter client structural type guard')
requireText(adminClient, 'const client: unknown = nuxtApp.$api', 'starter Nuxt injection normalization')
requireText(adminClient, 'if (!isClientApplication(client))', 'starter client runtime validation')
requireText(adminClient, 'function api(): ClientApplication', 'starter client helper return type')
forbidText(adminClient, 'const client = nuxtApp.$api', 'starter unnormalized Nuxt client inference')
requireText(userSchema, "declare module '@feathersjs/feathers'", 'starter auth entity Params augmentation')
requireText(userSchema, 'user?: User', 'starter authenticated user Params field')
requireText(messageService, 'authenticateNfz()', 'starter message auth hook')
requireText(userService, 'find: [authenticateNfz()]', 'starter user auth hook')

if (problems.length) {
  console.error('[nuxt-feathers-zod] Published starter type contract failed:')
  for (const problem of problems)
    console.error(`- ${problem}`)
  process.exit(1)
}

console.log('[nuxt-feathers-zod] Published starter client, MongoDB, auth entity and hybrid hook types are aligned.')
