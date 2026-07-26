import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (relative: string) => readFileSync(resolve(relative), 'utf8')

describe('published starter TypeScript contracts', () => {
  it('exposes the runtime types required by the exact packaged starter', () => {
    const server = read('src/runtime/server.ts')
    const authHook = read('src/runtime/auth/hook.ts')
    const clientPlugin = read('src/runtime/client/defineNfzClientPlugin.ts')
    const adminClient = read('examples/nfz-quasar-unocss-pinia-starter/app/composables/useAdminFeathers.ts')
    const userSchema = read('examples/nfz-quasar-unocss-pinia-starter/services/users/users.schema.ts')

    expect(server).toContain('mongodbClient?: Promise<Db>')
    expect(authHook).toContain('export type AuthenticateNfzHook = AroundHookFunction & HookFunction')
    expect(authHook).toContain('Promise<void | HookContext>')
    expect(authHook).not.toContain('Promise<unknown>')
    expect(clientPlugin).toContain('as ClientApplication')
    expect(adminClient).toContain('function isClientApplication(value: unknown): value is ClientApplication')
    expect(adminClient).toContain('const client: unknown = nuxtApp.$api')
    expect(adminClient).toContain('if (!isClientApplication(client))')
    expect(adminClient).toContain('function api(): ClientApplication')
    expect(adminClient).not.toContain('const client = nuxtApp.$api')
    expect(userSchema).toContain(`declare module '@feathersjs/feathers'`)
    expect(userSchema).toContain('user?: User')
  })
})
