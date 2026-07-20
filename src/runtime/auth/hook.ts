import type { HookContext, NextFunction } from '@feathersjs/feathers'
import { NotAuthenticated } from '@feathersjs/errors'
import { createNfzPrincipal } from './principal'

export interface AuthenticateNfzOptions {
  service?: string
  strategies?: string[]
}

export function authenticateNfz(options: AuthenticateNfzOptions = {}) {
  return async (context: HookContext, next?: NextFunction): Promise<unknown> => {
    const proceed = typeof next === 'function' ? next : async () => context
    if (context.type && context.type !== 'before' && context.type !== 'around')
      throw new NotAuthenticated('[nuxt-feathers-zod] authenticateNfz must be used as a before or around hook.')

    const { params, app, service } = context
    const authenticationApp = app as typeof app & { defaultAuthentication?(service?: string): any }
    const authService = authenticationApp.defaultAuthentication?.(options.service)
    if (!authService || typeof authService.authenticate !== 'function')
      throw new NotAuthenticated('[nuxt-feathers-zod] Authentication service is unavailable.')
    if (service === authService)
      return proceed()
    if (params.authenticated === true)
      return proceed()

    if (!params.authentication) {
      if (params.provider)
        throw new NotAuthenticated('Not authenticated')
      return proceed()
    }

    const configured = authService.configuration || {}
    const strategies = options.strategies?.length
      ? options.strategies
      : configured.parseStrategies?.length
        ? configured.parseStrategies
        : configured.authStrategies || []

    const { provider: _provider, authentication, ...authParams } = params
    const result = await authService.authenticate(authentication, authParams, ...strategies)
    const { accessToken: _accessToken, ...safeResult } = result
    const entityKey = configured.entity
    const principal = result.principal || createNfzPrincipal({
      provider: authentication.strategy || 'unknown',
      user: entityKey ? result[entityKey] : undefined,
      payload: result.authentication?.payload,
    })

    context.params = {
      ...params,
      ...safeResult,
      ...(principal ? { principal } : {}),
      authenticated: true,
    }

    return proceed()
  }
}
