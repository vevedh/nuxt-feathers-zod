import { afterEach, describe, expect, it, vi } from 'vitest'

import { createServerBootstrap } from '../../src/runtime/server/bootstrap'
import { clearNfzRuntimeInstance, getNfzRuntimeInstance } from '../../src/runtime/server/instance-registry'

function createNitroApp() {
  let closeHook: (() => Promise<void>) | undefined
  return {
    nitroApp: {
      hooks: {
        hook(name: string, handler: () => Promise<void>) {
          if (name === 'close')
            closeHook = handler
        },
      },
    },
    getCloseHook: () => closeHook,
  }
}

function missingMongoAdapterError() {
  return new Error('Service \'messages\' uses adapter \'mongodb\' but app.get(\'mongodbClient\') is not configured')
}

describe('server bootstrap', () => {
  afterEach(() => clearNfzRuntimeInstance('test-bootstrap'))

  it('waits for routers and closes Feathers plus MongoDB once', async () => {
    const calls: string[] = []
    const mongoClose = vi.fn(async () => {
      calls.push('mongo:close')
    })
    const app = Object.assign(() => undefined, {
      configure: vi.fn(),
      setup: vi.fn(async () => {
        calls.push('app:setup')
      }),
      teardown: vi.fn(async () => {
        calls.push('app:teardown')
      }),
      get: vi.fn((key: string) => key === 'mongodbConnection' ? { close: mongoClose } : undefined),
      set: vi.fn(),
    })
    const { nitroApp, getCloseHook } = createNitroApp()

    const bootstrap = createServerBootstrap({
      instanceId: 'test-bootstrap',
      config: { database: { mongo: false } },
      createApp: async () => app,
      configureInfrastructure: async () => {
        calls.push('infra')
      },
      createRouters: async () => {
        await Promise.resolve()
        calls.push('routers')
      },
      loadOrder: [],
      preModules: [],
      postModules: [],
      plugins: [],
      services: [],
    })

    await bootstrap(nitroApp)

    expect(calls).toEqual(['infra', 'app:setup', 'routers'])
    expect(getNfzRuntimeInstance('test-bootstrap')?.status).toBe('ready')

    await getCloseHook()?.()
    await getCloseHook()?.()

    expect(app.teardown).toHaveBeenCalledTimes(1)
    expect(mongoClose).toHaveBeenCalledTimes(1)
    expect(calls.slice(-2)).toEqual(['app:teardown', 'mongo:close'])
  })

  it('fails closed when a required persistent service cannot access its database', async () => {
    const app = Object.assign(() => undefined, {
      configure: vi.fn(),
      setup: vi.fn(),
      teardown: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    })
    const { nitroApp } = createNitroApp()
    const bootstrap = createServerBootstrap({
      instanceId: 'test-bootstrap',
      config: { database: { connections: {} }, server: {} },
      createApp: async () => app,
      configureInfrastructure: async () => undefined,
      createRouters: async () => undefined,
      loadOrder: ['services'],
      preModules: [],
      postModules: [],
      plugins: [],
      services: [{ label: 'service messages', handler: () => { throw missingMongoAdapterError() } }],
    })

    await expect(bootstrap(nitroApp)).rejects.toThrow(
      'Required service messages could not start because its configured database infrastructure is unavailable.',
    )
    expect(app.setup).not.toHaveBeenCalled()
    expect(app.teardown).toHaveBeenCalledTimes(1)
    expect(getNfzRuntimeInstance('test-bootstrap')?.status).toBe('failed')
    expect(getNfzRuntimeInstance('test-bootstrap')?.failureId).toMatch(/^nfz-test-bootstrap-/)
  })

  it('records an explicit compatibility skip for optional persistent services', async () => {
    const settings = new Map<string, unknown>()
    const app = Object.assign(() => undefined, {
      configure: vi.fn(),
      setup: vi.fn(),
      teardown: vi.fn(),
      get: vi.fn((key: string) => settings.get(key)),
      set: vi.fn((key: string, value: unknown) => settings.set(key, value)),
    })
    const { nitroApp } = createNitroApp()
    const bootstrap = createServerBootstrap({
      instanceId: 'test-bootstrap',
      config: {
        database: { connections: {} },
        server: { allowMissingDatabaseServices: true },
      },
      createApp: async () => app,
      configureInfrastructure: async () => undefined,
      createRouters: async () => undefined,
      loadOrder: ['services'],
      preModules: [],
      postModules: [],
      plugins: [],
      services: [{ label: 'service messages', handler: () => { throw missingMongoAdapterError() } }],
    })

    await bootstrap(nitroApp)

    expect(app.setup).toHaveBeenCalledTimes(1)
    expect(getNfzRuntimeInstance('test-bootstrap')?.status).toBe('ready')
    expect(settings.get('nfzSkippedRegistrars')).toEqual([{
      label: 'service messages',
      phase: 'services',
      reason: 'database-infrastructure-unavailable',
    }])
  })

  it('keeps an explicitly required registrar fail-closed even in compatibility mode', async () => {
    const app = Object.assign(() => undefined, {
      configure: vi.fn(),
      setup: vi.fn(),
      teardown: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    })
    const { nitroApp } = createNitroApp()
    const bootstrap = createServerBootstrap({
      instanceId: 'test-bootstrap',
      config: {
        database: { connections: {} },
        server: { allowMissingDatabaseServices: true },
      },
      createApp: async () => app,
      configureInfrastructure: async () => undefined,
      createRouters: async () => undefined,
      loadOrder: ['services'],
      preModules: [],
      postModules: [],
      plugins: [],
      services: [{ required: true, label: 'service messages', handler: () => { throw missingMongoAdapterError() } }],
    })

    await expect(bootstrap(nitroApp)).rejects.toThrow('Required service messages could not start')
    expect(app.setup).not.toHaveBeenCalled()
  })

  it('executes concurrent and ready re-invocations only once', async () => {
    const settings = new Map<string, unknown>()
    const services: Record<string, unknown> = {}
    const app = Object.assign(() => undefined, {
      services,
      configure: vi.fn(),
      setup: vi.fn(async () => undefined),
      teardown: vi.fn(async () => undefined),
      get: vi.fn((key: string) => settings.get(key)),
      set: vi.fn((key: string, value: unknown) => settings.set(key, value)),
      use: vi.fn((path: string, service: unknown) => {
        services[path] = service
      }),
    })
    const { nitroApp } = createNitroApp()
    let releaseInfrastructure!: () => void
    const infrastructureReady = new Promise<void>((resolve) => {
      releaseInfrastructure = resolve
    })
    const createApp = vi.fn(async () => app)
    const serviceRegistrar = vi.fn((target: typeof app) => target.use('messages', {}))
    const bootstrap = createServerBootstrap({
      instanceId: 'test-bootstrap',
      config: { server: {} },
      createApp,
      configureInfrastructure: async () => infrastructureReady,
      createRouters: async () => undefined,
      loadOrder: ['services'],
      preModules: [],
      postModules: [],
      plugins: [],
      services: [{ label: 'service messages', source: 'services/messages/messages.ts', handler: serviceRegistrar }],
    })

    const first = bootstrap(nitroApp)
    const second = bootstrap(nitroApp)
    releaseInfrastructure()
    await Promise.all([first, second])
    await bootstrap(nitroApp)

    expect(createApp).toHaveBeenCalledTimes(1)
    expect(serviceRegistrar).toHaveBeenCalledTimes(1)
    expect(app.setup).toHaveBeenCalledTimes(1)
  })

  it('reports both registrar sources for duplicate service paths', async () => {
    const settings = new Map<string, unknown>()
    const services: Record<string, unknown> = {}
    const app = Object.assign(() => undefined, {
      services,
      configure: vi.fn(),
      setup: vi.fn(),
      teardown: vi.fn(),
      get: vi.fn((key: string) => settings.get(key)),
      set: vi.fn((key: string, value: unknown) => settings.set(key, value)),
      use(path: string, service: unknown) {
        if (services[path])
          throw new Error(`Path ${path} already exists`)
        services[path] = service
      },
    })
    const { nitroApp } = createNitroApp()
    const bootstrap = createServerBootstrap({
      instanceId: 'test-bootstrap',
      config: { server: { duplicateServicePolicy: 'error' } },
      createApp: async () => app,
      configureInfrastructure: async () => undefined,
      createRouters: async () => undefined,
      loadOrder: ['services'],
      preModules: [],
      postModules: [],
      plugins: [],
      services: [
        { label: 'catalog auto', source: 'services/application-catalog/application-catalog.ts', handler: target => target.use('application-catalog', {}) },
        { label: 'catalog manual', source: 'server/feathers/plugins/traefik-services.ts', handler: target => target.use('application-catalog', {}) },
      ],
    })

    await expect(bootstrap(nitroApp)).rejects.toThrow(
      'first: services/application-catalog/application-catalog.ts\nsecond: server/feathers/plugins/traefik-services.ts',
    )
    expect(settings.get('nfzDuplicateServiceRegistrations')).toHaveLength(1)
  })

  it('can keep the first duplicate service under the explicit skip policy', async () => {
    const settings = new Map<string, unknown>()
    const services: Record<string, unknown> = {}
    const app = Object.assign(() => undefined, {
      services,
      configure: vi.fn(),
      setup: vi.fn(async () => undefined),
      teardown: vi.fn(),
      get: vi.fn((key: string) => settings.get(key)),
      set: vi.fn((key: string, value: unknown) => settings.set(key, value)),
      use(path: string, service: unknown) {
        services[path] = service
      },
    })
    const { nitroApp } = createNitroApp()
    const bootstrap = createServerBootstrap({
      instanceId: 'test-bootstrap',
      config: { server: { duplicateServicePolicy: 'skip' } },
      createApp: async () => app,
      configureInfrastructure: async () => undefined,
      createRouters: async () => undefined,
      loadOrder: ['services'],
      preModules: [],
      postModules: [],
      plugins: [],
      services: [
        { label: 'first', source: 'services/messages/messages.ts', handler: target => target.use('messages', { id: 'first' }) },
        { label: 'second', source: 'server/feathers/plugins/messages.ts', handler: target => target.use('messages', { id: 'second' }) },
      ],
    })

    await bootstrap(nitroApp)

    expect(services.messages).toEqual({ id: 'first' })
    expect(settings.get('nfzSkippedRegistrars')).toEqual([expect.objectContaining({
      label: 'second',
      source: 'server/feathers/plugins/messages.ts',
      reason: 'duplicate-service',
      servicePath: 'messages',
    })])
  })
})
