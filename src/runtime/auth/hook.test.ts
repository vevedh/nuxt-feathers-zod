import type { AroundHookFunction, HookContext, HookFunction } from '@feathersjs/feathers'
import { describe, expect, it, vi } from 'vitest'
import { authenticateNfz } from './hook'

const typedHook = authenticateNfz()
const asAroundHook: AroundHookFunction = typedHook
const asBeforeHook: HookFunction = typedHook

describe('authenticateNfz hook contract', () => {
  it('is assignable to before and around hook signatures', () => {
    expect(asAroundHook).toBe(typedHook)
    expect(asBeforeHook).toBe(typedHook)
  })

  it('returns the context for before hooks and void for around hooks', async () => {
    const authenticate = vi.fn(async () => ({
      accessToken: 'redacted',
      authentication: { payload: { sub: 'user-1' } },
      user: { id: 'user-1', roles: ['user'] },
    }))
    const authService = {
      authenticate,
      configuration: { entity: 'user', authStrategies: ['jwt'] },
    }
    const createHookContext = (type: 'before' | 'around'): HookContext => ({
      type,
      params: { authentication: { strategy: 'jwt', accessToken: 'token' } },
      app: { defaultAuthentication: () => authService },
      service: {},
    }) as unknown as HookContext

    const beforeContext = createHookContext('before')
    await expect(
      Promise.resolve(asBeforeHook.call(beforeContext.service, beforeContext)),
    ).resolves.toBe(beforeContext)
    expect(beforeContext.params.authenticated).toBe(true)

    const aroundContext = createHookContext('around')
    const next = vi.fn(async () => {})
    await expect(asAroundHook(aroundContext, next)).resolves.toBeUndefined()
    expect(aroundContext.params.authenticated).toBe(true)
    expect(next).toHaveBeenCalledOnce()
  })
})
