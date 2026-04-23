export interface NfzNormalizedClientError {
  name: string
  message: string
  code: string | number
  className?: string
  data?: unknown
  errors?: unknown
  cause?: unknown
  stack?: string
  raw: unknown
}

export function normalizeClientError(err: unknown): NfzNormalizedClientError {
  const toPlain = (src: any, fallbackMessage = 'Unknown error'): NfzNormalizedClientError => ({
    name: src?.name || 'Error',
    message: src?.message || fallbackMessage,
    code: src?.code ?? src?.statusCode ?? src?.status ?? src?.name ?? 'NFZ_ERROR',
    className: src?.className,
    data: src?.data,
    errors: src?.errors,
    cause: src?.cause,
    stack: src?.stack ? String(src.stack) : undefined,
    raw: err,
  })

  if (err == null)
    return toPlain({ name: 'Error', message: 'Unknown error', code: 'NFZ_UNKNOWN' })

  if (typeof err !== 'object')
    return toPlain({ name: 'Error', message: String(err), code: 'NFZ_ERROR' }, String(err))

  if (err instanceof Error)
    return toPlain(err, err.message || 'Error')

  return toPlain(err)
}
