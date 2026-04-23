import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import consola from 'consola'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { runDoctor } from '../src/cli/commands/doctor'

describe('nfz doctor mongo management diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports mongo management routes and redacts credentials', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-'))
    await mkdir(join(root, 'services', 'messages'), { recursive: true })
    await writeFile(join(root, 'services', 'messages', 'messages.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    transports: { rest: { path: '/feathers' } },
    database: {
      mongo: {
        url: 'mongodb://root:change-me@127.0.0.1:27017/app?authSource=admin',
        management: {
          enabled: true,
          auth: false,
          basePath: '///ops///mongo///',
          exposeUsersService: true,
        },
      },
    },
  },
})
`)

    const infos: string[] = []
    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(infos.some(line => line.includes('- database.mongo.url: mongodb://root:***@127.0.0.1:27017/app?authSource=admin'))).toBe(true)
    expect(infos.some(line => line.includes('- database.mongo.management.enabled: true'))).toBe(true)
    expect(infos.some(line => line.includes('- database.mongo.management.auth: false'))).toBe(true)
    expect(infos.some(line => line.includes('- database.mongo.management.basePath: /ops/mongo'))).toBe(true)
    expect(infos.some(line => line.includes('/ops/mongo/databases'))).toBe(true)
    expect(infos.some(line => line.includes('/ops/mongo/users'))).toBe(true)
    expect(warns).toEqual([])
  })

  it('reports embedded local auth defaults and payload shape', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-auth-defaults-'))
    await mkdir(join(root, 'services', 'users'), { recursive: true })
    await writeFile(join(root, 'services', 'users', 'users.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
  },
})
`)

    const infos: string[] = []
    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(infos.some(line => line.includes('- auth.enabled: true'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.source: default'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.authStrategies: local, jwt'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.usernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.entityUsernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes("- auth.local.payload.example: { strategy: 'local', userId: '<value>', password: '<value>' }"))).toBe(true)
    expect(warns).toEqual([])
  })

  it('warns when local auth request/entity fields diverge', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-auth-mapping-'))
    await mkdir(join(root, 'services', 'users'), { recursive: true })
    await writeFile(join(root, 'services', 'users', 'users.ts'), 'export const ok = true\n')
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    servicesDirs: ['services'],
    auth: {
      authStrategies: ['local', 'jwt'],
      service: 'users',
      entity: 'user',
      local: {
        usernameField: 'userId',
        passwordField: 'password',
        entityUsernameField: 'userId',
        entityPasswordField: 'passwordHash',
      },
    },
  },
})
`)

    const infos: string[] = []
    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation((msg?: any) => { infos.push(String(msg ?? '')) })
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(infos.some(line => line.includes('- auth.local.usernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.entityUsernameField: userId'))).toBe(true)
    expect(infos.some(line => line.includes('- auth.local.entityPasswordField: passwordHash'))).toBe(true)
    expect(warns.some(line => line.includes('Local auth request/entity field mapping differs.'))).toBe(true)
  })

  it('warns when mongo management is enabled without a mongo url', async () => {
    const root = await mkdtemp(join(tmpdir(), 'nfz-doctor-'))
    await writeFile(join(root, 'nuxt.config.ts'), `
export default defineNuxtConfig({
  modules: ['nuxt-feathers-zod'],
  feathers: {
    client: { mode: 'embedded' },
    database: {
      mongo: {
        management: {
          enabled: true,
        },
      },
    },
  },
})
`)

    const warns: string[] = []
    vi.spyOn(consola, 'info').mockImplementation(() => {})
    vi.spyOn(consola, 'warn').mockImplementation((msg?: any) => { warns.push(String(msg ?? '')) })

    await runDoctor(root)

    expect(warns.some(line => line.includes('Mongo management is enabled but database.mongo.url is missing.'))).toBe(true)
  })
})
