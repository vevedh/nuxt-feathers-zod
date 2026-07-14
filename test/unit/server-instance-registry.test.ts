import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  beginNfzRuntimeInstance,
  clearNfzRuntimeInstance,
  markNfzRuntimeFailed,
  markNfzRuntimeReady,
  setNfzRuntimeCloseHandler,
  waitForNfzRuntimeInstance,
} from '../../src/runtime/server/instance-registry'

describe('runtime instance registry', () => {
  afterEach(() => clearNfzRuntimeInstance('test'))

  it('resolves requests only after the instance is ready', async () => {
    const instance = beginNfzRuntimeInstance<{ name: string }>('test')
    const waiting = waitForNfzRuntimeInstance<{ name: string }>('test', 500)

    markNfzRuntimeReady(instance, { name: 'app' })

    const resolved = await waiting
    expect(resolved.status).toBe('ready')
    expect(resolved.app).toEqual({ name: 'app' })
  })

  it('propagates startup failures', async () => {
    const instance = beginNfzRuntimeInstance('test')
    markNfzRuntimeFailed(instance, new Error('startup failed'))

    await expect(waitForNfzRuntimeInstance('test', 50)).rejects.toThrow('startup failed')
  })

  it('runs the close handler once', async () => {
    const instance = beginNfzRuntimeInstance('test')
    const close = vi.fn(async () => undefined)
    setNfzRuntimeCloseHandler(instance, close)

    await Promise.all([instance.close(), instance.close()])

    expect(close).toHaveBeenCalledTimes(1)
    expect(instance.status).toBe('closed')
  })
})
