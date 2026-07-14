import { createError, defineEventHandler, getRouterParam } from 'h3'
import { callNfzConsoleService } from '../../../console-bridge'
import { NFZ_CONSOLE_SERVICE_PATHS } from '../../../console-services'

export default defineEventHandler(async (event) => {
  const service = getRouterParam(event, 'service')
  if (!service)
    throw createError({ statusCode: 400, message: 'Missing :service param' })
  return callNfzConsoleService(event, NFZ_CONSOLE_SERVICE_PATHS.schemas, 'get', [service])
})
