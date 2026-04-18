import type { ServiceTypes } from '../client'
import { useFeathers } from './feathers'
import { useAuthRuntime } from './useAuthRuntime'

function getStatusCode(error: any) {
  const value = error?.statusCode ?? error?.status ?? error?.response?.status
  return typeof value === 'number' ? value : Number(value || 0) || null
}

function normalizeProtectedServiceError(error: any) {
  const source = error && typeof error === 'object' ? error : { message: String(error ?? 'Unknown error') }
  return {
    name: source?.name || 'Error',
    message: source?.message || source?.statusMessage || 'Service call failed',
    code: source?.code ?? source?.statusCode ?? source?.status ?? 'NFZ_SERVICE_ERROR',
    statusCode: source?.statusCode ?? source?.status ?? source?.response?.status,
    data: source?.data,
    cause: source?.cause,
    raw: error,
  }
}

export function useProtectedService<L extends keyof ServiceTypes>(path: L): ServiceTypes[L] {
  const { client } = useFeathers()
  const auth = useAuthRuntime()
  const service = client.service<ServiceTypes[L]>(String(path)) as any
  const nonWrappedMethods = new Set(['hooks', 'publish'])

  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof prop !== 'string' || typeof value !== 'function' || nonWrappedMethods.has(prop) || prop.startsWith('__'))
        return typeof value === 'function' ? value.bind(target) : value

      return async (...args: any[]) => {
        await auth.ensureReady('protected-service')
        if (auth.provider.value === 'keycloak')
          await auth.ensureValidatedBearer('protected-service')
        try {
          return await value.apply(target, args)
        }
        catch (error) {
          if (getStatusCode(error) === 401) {
            await auth.reAuthenticate().catch(() => null)
            try {
              return await value.apply(target, args)
            }
            catch (retryError) {
              throw normalizeProtectedServiceError(retryError)
            }
          }
          throw normalizeProtectedServiceError(error)
        }
      }
    },
  }) as ServiceTypes[L]
}
