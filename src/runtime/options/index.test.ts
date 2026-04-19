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


describe('resolvePublicRuntimeConfig', () => {
  it('exposes local auth field metadata in public runtime config', async () => {
    const resolved = await resolveOptions({
      transports: { rest: { path: '/feathers', framework: 'express' }, websocket: false },
      database: {},
      servicesDirs: [],
      server: serverDefaults,
      auth: {
        authStrategies: ['local', 'jwt'],
        local: {
          usernameField: 'userId',
          passwordField: 'password',
          entityUsernameField: 'userId',
          entityPasswordField: 'password',
        },
      },
      keycloak: false,
      client: { mode: 'embedded', pinia: false },
      validator: { formats: [], extendDefaults: true },
      loadFeathersConfig: false,
      swagger: false,
      templates: undefined,
      devtools: false,
    } as any, nuxtMock)

    const pub = resolvePublicRuntimeConfig(resolved)
    expect(pub.auth?.local?.usernameField).toBe('userId')
    expect(pub.auth?.local?.passwordField).toBe('password')
    expect(pub.auth?.local?.entityUsernameField).toBe('userId')
    expect(pub.auth?.local?.entityPasswordField).toBe('password')
  })

  it('exposes mongo management public runtime metadata', async () => {
    const resolved = await resolveOptions({
      transports: { rest: { path: '/feathers', framework: 'express' }, websocket: false },
      database: {
        mongo: {
          url: 'mongodb://localhost:27017/test',
          management: {
            enabled: true,
            basePath: '/mongo-admin',
            auth: { enabled: true, authenticate: true },
            exposeDatabasesService: true,
            exposeCollectionsService: true,
            exposeCollectionCrud: true,
          },
        },
      },
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

    const pub = resolvePublicRuntimeConfig(resolved)
    expect(pub.database?.mongo?.management?.enabled).toBe(true)
    expect(pub.database?.mongo?.management?.basePath).toBe('/mongo-admin')
    expect(pub.database?.mongo?.management?.routes?.some(route => route.path === '/mongo-admin/databases')).toBe(true)
  })

  it('prefixes the embedded mongo management path with the rest path in public runtime helpers', async () => {
    const { getPublicMongoManagementBasePath } = await import('../utils/config')

    const pub = resolvePublicRuntimeConfig(await resolveOptions({
      transports: {
        rest: { framework: 'express', path: '/feathers' },
      },
      database: {
        mongo: {
          url: 'mongodb://localhost:27017/test',
          management: {
            enabled: true,
            basePath: '/mongo',
          },
        },
      },
      servicesDirs: [],
      server: serverDefaults,
      auth: false,
      keycloak: false,
      client: {
        mode: 'embedded',
        pinia: false,
      },
      validator: { formats: [], extendDefaults: true },
      loadFeathersConfig: false,
      swagger: false,
      templates: undefined,
      devtools: false,
    } as any, nuxtMock))

    expect(getPublicMongoManagementBasePath({ _feathers: pub } as any)).toBe('/feathers/mongo')
  })


  it('exposes public admin diagnostics/devtools metadata', async () => {
    const { getPublicDiagnosticsPath, getPublicDevtoolsCssPath, getPublicDevtoolsPath } = await import('../utils/config')

    const pub = resolvePublicRuntimeConfig(await resolveOptions({
      transports: { rest: { framework: 'express', path: '/feathers' }, websocket: false },
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
      devtools: true,
    } as any, nuxtMock))

    expect(pub.admin?.diagnostics?.enabled).toBe(true)
    expect(pub.admin?.devtools?.enabled).toBe(true)
    expect(getPublicDiagnosticsPath({ _feathers: pub } as any)).toBe('/__nfz-devtools.json')
    expect(getPublicDevtoolsPath({ _feathers: pub } as any)).toBe('/__nfz-devtools')
    expect(getPublicDevtoolsCssPath({ _feathers: pub } as any)).toBe('/__nfz-devtools.css')
  })

  it('exposes public builder metadata and helper paths', async () => {
    const {
      getPublicBuilderApplyPath,
      getPublicBuilderManifestPath,
      getPublicBuilderPreviewPath,
      getPublicBuilderServicesPath,
    } = await import('../utils/config')

    const pub = resolvePublicRuntimeConfig(await resolveOptions({
      transports: { rest: { framework: 'express', path: '/feathers' }, websocket: false },
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
      devtools: true,
    } as any, nuxtMock))

    expect(pub.builder?.enabled).toBe(true)
    expect(getPublicBuilderServicesPath({ _feathers: pub } as any)).toBe('/api/nfz/services')
    expect(getPublicBuilderManifestPath({ _feathers: pub } as any)).toBe('/api/nfz/manifest')
    expect(getPublicBuilderPreviewPath({ _feathers: pub } as any)).toBe('/api/nfz/preview')
    expect(getPublicBuilderApplyPath({ _feathers: pub } as any)).toBe('/api/nfz/apply')
  })

})
