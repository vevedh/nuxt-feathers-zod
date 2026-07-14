import { createError, defineEventHandler, getQuery } from 'h3'
import { callNfzConsoleService } from '../../console-bridge'
import { NFZ_CONSOLE_SERVICE_PATHS } from '../../console-services'

export default defineEventHandler(async (event) => {
  const service = String(getQuery(event).service || '').trim()
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing query parameter: service' })
  return callNfzConsoleService(event, NFZ_CONSOLE_SERVICE_PATHS.schemas, 'get', [service])
})
