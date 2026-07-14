import { createError, getRequestHeaders, setResponseHeader } from 'h3'
import { waitForNfzRuntimeInstance } from './instance-registry'

export const NFZ_LEGACY_API_DEPRECATION = {
  deprecation: 'true',
  successor: 'Feathers services under nfz/*',
} as const

function createServiceParams(event: any, query?: Record<string, unknown>) {
  return {
    provider: 'rest',
    headers: getRequestHeaders(event),
    query,
  }
}

function markLegacyRoute(event: any): void {
  setResponseHeader(event, 'Deprecation', NFZ_LEGACY_API_DEPRECATION.deprecation)
  setResponseHeader(event, 'Link', '</guide/builder-client>; rel="deprecation"')
  setResponseHeader(event, 'X-NFZ-Successor', NFZ_LEGACY_API_DEPRECATION.successor)
}

function toH3Error(error: unknown): never {
  const candidate = error as {
    code?: number
    status?: number
    statusCode?: number
    message?: string
    data?: unknown
    name?: string
  }
  throw createError({
    statusCode: Number(candidate?.statusCode || candidate?.status || candidate?.code || 500),
    statusMessage: candidate?.message || 'NFZ Feathers service call failed.',
    message: candidate?.message || 'NFZ Feathers service call failed.',
    data: candidate?.data,
  })
}

export async function callNfzConsoleService(
  event: any,
  path: string,
  method: string,
  args: unknown[] = [],
  query?: Record<string, unknown>,
): Promise<unknown> {
  markLegacyRoute(event)
  const instance = await waitForNfzRuntimeInstance('default')
  const service = (instance.app).service(path)
  const handler = service?.[method]
  if (typeof handler !== 'function') {
    throw createError({
      statusCode: 405,
      message: `Feathers service ${path} does not expose ${method}().`,
    })
  }

  try {
    return await handler.call(service, ...args, createServiceParams(event, query))
  }
  catch (error) {
    return toH3Error(error)
  }
}
