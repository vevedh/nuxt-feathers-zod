import { normalizeClientError } from './normalize-client-error'

type ServiceLike = Record<string, any> & { __nfz_api_wrapped?: boolean }
type ApiLike = {
  service?: (path: string) => ServiceLike
}

const STANDARD_METHODS = ['find', 'get', 'create', 'update', 'patch', 'remove'] as const

export function wrapApiServices<T extends ApiLike>(api: T): T {
  if (!api || typeof api.service !== 'function')
    return api

  const original = api.service.bind(api)

  api.service = ((path: string) => {
    const service = original(path)

    if (!service || typeof service !== 'object' || service.__nfz_api_wrapped)
      return service

    for (const method of STANDARD_METHODS) {
      const fn = service[method]
      if (typeof fn !== 'function')
        continue

      service[method] = async (...args: unknown[]) => {
        try {
          return await fn.apply(service, args)
        }
        catch (error) {
          throw normalizeClientError(error)
        }
      }
    }

    service.__nfz_api_wrapped = true
    return service
  }) as T['service']

  return api
}
