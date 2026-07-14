import { useAuthBoundFetch } from './useAuthBoundFetch'

export interface AuthenticatedRequestOptions {
  auth?: 'required' | 'optional' | 'none'
  retryOn401?: boolean
  headers?: HeadersInit
  [key: string]: any
}

function normalizeRequestError(error: any) {
  const source = error && typeof error === 'object' ? error : { message: String(error ?? 'Unknown error') }
  return {
    name: source?.name || 'Error',
    message: source?.message || source?.statusMessage || 'Request failed',
    code: source?.code ?? source?.statusCode ?? source?.status ?? 'NFZ_REQUEST_ERROR',
    statusCode: source?.statusCode ?? source?.status ?? source?.response?.status,
    data: source?.data,
    cause: source?.cause,
    raw: error,
  }
}

export function useAuthenticatedRequest() {
  const authFetch = useAuthBoundFetch()

  return async function authenticatedRequest<T = any>(url: string, options: AuthenticatedRequestOptions = {}): Promise<T> {
    try {
      return await authFetch<T>(url, options)
    }
    catch (error) {
      throw normalizeRequestError(error)
    }
  }
}
