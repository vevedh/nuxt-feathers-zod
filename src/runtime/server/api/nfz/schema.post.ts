import { createError, defineEventHandler, readBody } from 'h3'
import { callNfzConsoleService } from '../../console-bridge'
import { NFZ_CONSOLE_SERVICE_PATHS } from '../../console-services'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const service = String(body?.service || '').trim()
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing body field: service' })
  const { service: _service, ...data } = body
  return callNfzConsoleService(event, NFZ_CONSOLE_SERVICE_PATHS.schemas, 'patch', [service, data])
})
