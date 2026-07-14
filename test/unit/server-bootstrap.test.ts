import { afterEach, describe, expect, it, vi } from 'vitest'

import { createServerBootstrap } from '../../src/runtime/server/bootstrap'
import { clearNfzRuntimeInstance, getNfzRuntimeInstance } from '../../src/runtime/server/instance-registry'

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
    })
    let closeHook: (() => Promise<void>) | undefined
    const nitroApp = {
      hooks: {
        hook(name: string, handler: () => Promise<void>) {
          if (name === 'close')
            closeHook = handler
        },
      },
    }

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

    await closeHook?.()
    await closeHook?.()

    expect(app.teardown).toHaveBeenCalledTimes(1)
    expect(mongoClose).toHaveBeenCalledTimes(1)
    expect(calls.slice(-2)).toEqual(['app:teardown', 'mongo:close'])
  })
})
