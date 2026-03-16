import { describe, expect, it } from 'vitest'
import { resolveOptions, resolvePublicRuntimeConfig } from './index'
import { serverDefaults } from './server'

const nuxtMock = {
  options: {
    rootDir: process.cwd(),
    srcDir: process.cwd(),
    buildDir: `${process.cwd()}/.nuxt-test`,
    runtimeConfig: { public: {} },
  },
} as any

describe('resolveOptions', () => {
  it('propagates express as the embedded server framework', async () => {
    const resolved = await resolveOptions({
      transports: { rest: { path: '/feathers', framework: 'express' }, websocket: false },
      database: {},
      servicesDirs: [],
      server: serverDefaults,
      auth: false,
      keycloak: false,
      client: { mode: 'embedded', pinia: false },
      validator: { formats: [], extendDefaults: true },
      loadFeathersConfig: false,
      swagger: false,
      templates: undefined,
      devtools: false,
    } as any, nuxtMock)

    const moduleIds = resolved.server.modules.map((m: any) => m.from)
    expect(moduleIds.some((id: string) => id.includes('/express/'))).toBe(true)
    expect(moduleIds.some((id: string) => id.includes('/koa/'))).toBe(false)
  })

  it('propagates koa as the embedded server framework', async () => {
    const resolved = await resolveOptions({
      transports: { rest: { path: '/feathers', framework: 'koa' }, websocket: false },
      database: {},
      servicesDirs: [],
      server: serverDefaults,
      auth: false,
      keycloak: false,
      client: { mode: 'embedded', pinia: false },
      validator: { formats: [], extendDefaults: true },
      loadFeathersConfig: false,
      swagger: false,
      templates: undefined,
      devtools: false,
    } as any, nuxtMock)

    const moduleIds = resolved.server.modules.map((m: any) => m.from)
    expect(moduleIds.some((id: string) => id.includes('/koa/'))).toBe(true)
    expect(moduleIds.some((id: string) => id.includes('/express/'))).toBe(false)
  })

  it('keeps remote mode server disabled by default and exposes remote services', async () => {
    const resolved = await resolveOptions({
      transports: { rest: { path: '/feathers', framework: 'express' }, websocket: true },
      database: {},
      servicesDirs: [],
      server: {},
      auth: false,
      keycloak: false,
      client: {
        mode: 'remote',
        pinia: false,
        remote: {
          url: 'https://api.example.com',
          transport: 'rest',
          auth: { enabled: true },
          services: [{ path: 'messages' }, { path: 'users', methods: ['find', 'get'] }],
        },
      },
      validator: { formats: [], extendDefaults: true },
      loadFeathersConfig: false,
      swagger: false,
      templates: undefined,
      devtools: false,
    } as any, nuxtMock)

    expect(((resolved.server as any)?.enabled ?? false)).toBe(false)
    expect(resolved.client && resolved.client.mode).toBe('remote')
    expect(resolved.client && resolved.client.remote && resolved.client.remote.services).toHaveLength(2)
  })
})
