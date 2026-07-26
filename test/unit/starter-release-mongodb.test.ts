import { describe, expect, it, vi } from 'vitest'
import {
  provisionStarterReleaseMongo,
  resolveStarterReleaseMongoMode,
} from '../../scripts/lib/starter-release-mongodb.mjs'

describe('starter release MongoDB provisioning', () => {
  it('defaults to auto and rejects unsupported modes', () => {
    expect(resolveStarterReleaseMongoMode(undefined)).toBe('auto')
    expect(() => resolveStarterReleaseMongoMode('docker')).toThrow(/auto, external or memory/)
  })

  it('uses a reachable external connection in auto mode', async () => {
    const probe = vi.fn().mockResolvedValue(undefined)
    const createMemoryRuntime = vi.fn()

    const runtime = await provisionStarterReleaseMongo({
      requestedUrl: 'mongodb://127.0.0.1:27017/nfz_release',
      mode: 'auto',
      probe,
      createMemoryRuntime,
      logger: { info: vi.fn(), warn: vi.fn() },
    })

    expect(runtime.mode).toBe('external')
    expect(probe).toHaveBeenCalledOnce()
    expect(createMemoryRuntime).not.toHaveBeenCalled()
  })

  it('falls back to an isolated runtime when the configured URL is unreachable', async () => {
    const stop = vi.fn().mockResolvedValue(undefined)
    const memoryRuntime = {
      mode: 'memory',
      url: 'mongodb://127.0.0.1:49152/nfz_starter_release',
      stop,
    }
    const createMemoryRuntime = vi.fn().mockResolvedValue(memoryRuntime)

    const runtime = await provisionStarterReleaseMongo({
      requestedUrl: 'mongodb://127.0.0.1:27017/nfz_release',
      mode: 'auto',
      probe: vi.fn().mockRejectedValue(new Error('offline')),
      createMemoryRuntime,
      logger: { info: vi.fn(), warn: vi.fn() },
    })

    expect(runtime).toBe(memoryRuntime)
    expect(createMemoryRuntime).toHaveBeenCalledOnce()
    await runtime.stop()
    expect(stop).toHaveBeenCalledOnce()
  })

  it('starts an isolated runtime when no URL is configured', async () => {
    const createMemoryRuntime = vi.fn().mockResolvedValue({
      mode: 'memory',
      url: 'mongodb://127.0.0.1:49153/nfz_starter_release',
      stop: vi.fn(),
    })

    const runtime = await provisionStarterReleaseMongo({
      requestedUrl: '',
      mode: 'auto',
      probe: vi.fn(),
      createMemoryRuntime,
      logger: { info: vi.fn(), warn: vi.fn() },
    })

    expect(runtime.mode).toBe('memory')
    expect(createMemoryRuntime).toHaveBeenCalledOnce()
  })

  it('keeps external mode fail-fast and explicit', async () => {
    await expect(provisionStarterReleaseMongo({
      requestedUrl: '',
      mode: 'external',
      logger: { info: vi.fn(), warn: vi.fn() },
    })).rejects.toThrow(/requires MONGODB_URL/)

    await expect(provisionStarterReleaseMongo({
      requestedUrl: 'mongodb://127.0.0.1:27017/nfz_release',
      mode: 'external',
      probe: vi.fn().mockRejectedValue(new Error('offline')),
      logger: { info: vi.fn(), warn: vi.fn() },
    })).rejects.toThrow(/external MONGODB_URL is unreachable/)
  })
})
