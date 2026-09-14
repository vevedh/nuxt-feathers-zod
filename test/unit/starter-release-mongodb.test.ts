import { describe, expect, it, vi } from 'vitest'
import {
  provisionStarterReleaseMongo,
  resolveStarterReleaseMongoMode,
} from '../../scripts/lib/starter-release-mongodb.mjs'

describe('starter release mongodb provisioning', () => {
  it('defaults to auto and rejects unsupported modes', () => {
    expect(resolveStarterReleaseMongoMode(undefined)).toBe('auto')
    expect(() => resolveStarterReleaseMongoMode('docker')).toThrow(/auto, external or memory/)
  })

  it('keeps auto mode isolated even when MONGODB_URL is configured', async () => {
    const probe = vi.fn()
    const memoryRuntime = {
      mode: 'memory',
      url: 'mongodb://127.0.0.1:49152/nfz_starter_release',
      stop: vi.fn().mockResolvedValue(undefined),
    }
    const createMemoryRuntime = vi.fn().mockResolvedValue(memoryRuntime)
    const logger = { info: vi.fn(), warn: vi.fn() }

    const runtime = await provisionStarterReleaseMongo({
      requestedUrl: 'mongodb://127.0.0.1:27017/nfz_release',
      mode: 'auto',
      probe,
      createMemoryRuntime,
      logger,
    })

    expect(runtime).toBe(memoryRuntime)
    expect(probe).not.toHaveBeenCalled()
    expect(createMemoryRuntime).toHaveBeenCalledOnce()
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('MONGODB_URL is ignored in auto mode'))
  })

  it('starts an isolated runtime when auto mode has no URL', async () => {
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

  it('keeps memory mode isolated regardless of an inherited URL', async () => {
    const createMemoryRuntime = vi.fn().mockResolvedValue({
      mode: 'memory',
      url: 'mongodb://127.0.0.1:49154/nfz_starter_release',
      stop: vi.fn(),
    })
    const probe = vi.fn()

    const runtime = await provisionStarterReleaseMongo({
      requestedUrl: 'mongodb://127.0.0.1:27017/nfz_release',
      mode: 'memory',
      probe,
      createMemoryRuntime,
      logger: { info: vi.fn(), warn: vi.fn() },
    })

    expect(runtime.mode).toBe('memory')
    expect(probe).not.toHaveBeenCalled()
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
      probe: vi.fn().mockRejectedValue(new Error('authentication failed')),
      logger: { info: vi.fn(), warn: vi.fn() },
    })).rejects.toThrow(/unreachable or cannot authenticate/)
  })

  it('uses an explicitly requested external connection after its probe succeeds', async () => {
    const probe = vi.fn().mockResolvedValue(undefined)
    const createMemoryRuntime = vi.fn()

    const runtime = await provisionStarterReleaseMongo({
      requestedUrl: 'mongodb://user:secret@127.0.0.1:27017/nfz_release?authSource=admin',
      mode: 'external',
      probe,
      createMemoryRuntime,
      logger: { info: vi.fn(), warn: vi.fn() },
    })

    expect(runtime.mode).toBe('external')
    expect(runtime.url).toContain('mongodb://user:secret@')
    expect(probe).toHaveBeenCalledOnce()
    expect(createMemoryRuntime).not.toHaveBeenCalled()
  })

  it('reports the explicit external escape hatch when isolated MongoDB cannot start', async () => {
    await expect(provisionStarterReleaseMongo({
      requestedUrl: 'mongodb://127.0.0.1:27017/nfz_release',
      mode: 'auto',
      probe: vi.fn(),
      createMemoryRuntime: vi.fn().mockRejectedValue(new Error('binary unavailable')),
      logger: { info: vi.fn(), warn: vi.fn() },
    })).rejects.toThrow(/NFZ_STARTER_RELEASE_MONGODB_MODE=external/)
  })
})
