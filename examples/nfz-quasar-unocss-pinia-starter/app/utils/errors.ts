interface ErrorLikeRecord {
  name?: unknown
  message?: unknown
  code?: unknown
  className?: unknown
  data?: unknown
  errors?: unknown
  response?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  }
  catch {
    return String(value)
  }
}

function readNestedMessage(value: unknown): string | null {
  if (!isRecord(value))
    return null

  const message = value.message
  if (typeof message === 'string' && message.trim())
    return message

  return null
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string')
    return error

  if (error instanceof Error)
    return error.message

  if (!isRecord(error))
    return String(error)

  const err = error as ErrorLikeRecord

  if (typeof err.message === 'string' && err.message.trim())
    return err.message

  const responseMessage = readNestedMessage(err.response)
  if (responseMessage)
    return responseMessage

  if (isRecord(err.response)) {
    const responseDataMessage = readNestedMessage(err.response._data)
    if (responseDataMessage)
      return responseDataMessage
  }

  const dataMessage = readNestedMessage(err.data)
  if (dataMessage)
    return dataMessage

  const details = stringifySafe(error)
  if (details && details !== '{}')
    return details

  return 'Erreur inconnue.'
}

export function getFeathersErrorDebug(error: unknown): string {
  if (!isRecord(error))
    return getErrorMessage(error)

  return stringifySafe(error)
}
